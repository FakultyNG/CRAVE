import { connection } from "next/server";
import { apiOwner } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { ownerBalance } from "@/lib/finance/balance";
import { isLastCalendarDayInLagos } from "@/lib/finance/calendar";
import { handleApiError } from "@/lib/api";

export async function GET() {
  await connection();
  try { const auth = await apiOwner(); if ("response" in auth) return auth.response; const db = getDb(); const owner = await db.ownerProfile.findUnique({ where: { userId: auth.session.user.id } }); if (!owner) return Response.json({ error: { message: "Owner profile not found." } }, { status: 404 }); const [balance, withdrawals, transactions] = await Promise.all([ownerBalance(owner.id), db.withdrawalRequest.findMany({ where: { ownerId: owner.id }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, amountKobo: true, bankName: true, accountNumberLast4: true, accountName: true, requestedAt: true, paidAt: true, failureReason: true } }), db.ownerLedgerEntry.findMany({ where: { ownerId: owner.id }, orderBy: { createdAt: "desc" }, take: 100 })]); const earlyAllowed = process.env.NODE_ENV !== "production" && process.env.ALLOW_EARLY_WITHDRAWALS === "true"; return Response.json({ balance, withdrawals, transactions, canRequestToday: isLastCalendarDayInLagos() || earlyAllowed, timezone: "Africa/Lagos" }); }
  catch (error) { return handleApiError(error); }
}
