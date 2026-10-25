import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { verifyAndApplyStaffWithdrawal, verifyAndApplyWithdrawal } from "@/lib/finance/withdrawals";
import { handleApiError, jsonError } from "@/lib/api";

function findReference(value: unknown): string | null { if (!value || typeof value !== "object") return null; const source = value as Record<string, unknown>; for (const key of ["merchantTxRef", "merchant_reference", "reference"]) if (typeof source[key] === "string") return source[key]; return findReference(source.data); }
export async function POST(request: Request) {
  try { const raw = await request.text(); let payload: unknown = {}; if (raw) { try { payload = JSON.parse(raw); } catch { payload = Object.fromEntries(new URLSearchParams(raw)); } } const reference = findReference(payload); if (!reference) return jsonError("Transfer reference is required.", 400); const hash = createHash("sha256").update(raw || JSON.stringify(payload)).digest("hex"); const db = getDb(); const webhook = await db.providerWebhook.upsert({ where: { payloadHash: hash }, update: {}, create: { provider: "STROWALLET_TRANSFER", payloadHash: hash, payload: payload as never } }); if (webhook.processedAt) return Response.json({ received: true, duplicate: true }); const withdrawal = await verifyAndApplyWithdrawal(reference) ?? await verifyAndApplyStaffWithdrawal(reference); if (!withdrawal) return jsonError("Withdrawal not found.", 404); await db.providerWebhook.update({ where: { id: webhook.id }, data: { processedAt: new Date() } }); return Response.json({ received: true }); }
  catch (error) { return handleApiError(error); }
}
