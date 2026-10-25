import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { verifyPayment } from "@/lib/commerce/orders";
import { handleApiError, jsonError } from "@/lib/api";

function findReference(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  for (const key of ["reference", "transaction_reference", "ref"]) if (typeof source[key] === "string") return source[key] as string;
  return findReference(source.data);
}

async function processPayload(payload: unknown, fallbackReference?: string | null) {
  const serialized = JSON.stringify(payload);
  const payloadHash = createHash("sha256").update(serialized).digest("hex");
  const db = getDb();
  const webhook = await db.providerWebhook.upsert({ where: { payloadHash }, update: {}, create: { provider: "STROWALLET", payloadHash, payload: payload as never } });
  if (webhook.processedAt) return Response.json({ received: true, duplicate: true });
  const reference = findReference(payload) ?? fallbackReference;
  if (!reference) return jsonError("Payment reference is required.", 400);
  await verifyPayment(reference);
  await db.providerWebhook.update({ where: { id: webhook.id }, data: { processedAt: new Date() } });
  return Response.json({ received: true });
}

export async function POST(request: Request) {
  try { const raw = await request.text(); let payload: unknown = {}; if (raw) { try { payload = JSON.parse(raw); } catch { payload = Object.fromEntries(new URLSearchParams(raw)); } } return await processPayload(payload); }
  catch (error) { return handleApiError(error); }
}

export async function GET(request: Request) {
  try { const url = new URL(request.url); const payload = Object.fromEntries(url.searchParams); return await processPayload(payload, url.searchParams.get("reference")); }
  catch (error) { return handleApiError(error); }
}
