import { connection } from "next/server";
import { apiOwner } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { ownerBalance } from "@/lib/finance/balance";
import { ownershipAt } from "@/lib/profit/ownership";
import { handleApiError, jsonError } from "@/lib/api";

export async function GET() {
  await connection();
  try {
    const auth = await apiOwner(); if ("response" in auth) return auth.response; const db = getDb();
    const owner = await db.ownerProfile.findUnique({ where: { userId: auth.session.user.id }, include: { user: { select: { preferredName: true, email: true, phone: true, phoneVerifiedAt: true } }, ownershipRecords: { orderBy: { effectiveAt: "desc" }, include: { createdBy: { select: { preferredName: true } } } } } });
    if (!owner) return jsonError("Owner profile not found.", 404);
    const [balance, allocations, withdrawals, lifetimeCredits, lifetimeDebits] = await Promise.all([
      ownerBalance(owner.id),
      db.profitAllocation.findMany({ where: { ownerId: owner.id, calculation: { status: { in: ["CALCULATED", "APPROVED", "POSTED"] } } }, include: { calculation: { include: { period: true } } }, orderBy: { calculation: { period: { startsAt: "desc" } } } }),
      db.withdrawalRequest.findMany({ where: { ownerId: owner.id }, orderBy: { requestedAt: "desc" } }),
      db.ownerLedgerEntry.aggregate({ where: { ownerId: owner.id, type: "CREDIT", sourceType: "PROFIT_ALLOCATION" }, _sum: { amountKobo: true } }),
      db.ownerLedgerEntry.aggregate({ where: { ownerId: owner.id, type: "DEBIT", sourceType: "WITHDRAWAL" }, _sum: { amountKobo: true } }),
    ]);
    const currentOwnership = ownershipAt(owner.ownershipRecords, new Date()).find((record) => record.ownerId === owner.id);
    const pendingKobo = allocations.filter((item) => item.status === "PENDING" && item.calculation.status !== "POSTED").reduce((sum, item) => sum + item.amountKobo, 0);
    const heldKobo = allocations.filter((item) => item.status === "HELD").reduce((sum, item) => sum + item.amountKobo, 0);
    return Response.json({ owner: { id: owner.id, isActive: owner.isActive, user: owner.user, currentPercentageBps: currentOwnership?.percentageBps ?? 0, effectiveAt: currentOwnership?.effectiveAt ?? null, ownershipHistory: owner.ownershipRecords, payoutDetailsComplete: Boolean(owner.bankCode && owner.accountNumberEncrypted && owner.accountName) }, balance: { pendingKobo, availableKobo: balance.availableKobo, approvedKobo: balance.approvedKobo, reservedKobo: balance.reservedKobo, heldKobo, lifetimeAllocationsKobo: lifetimeCredits._sum.amountKobo ?? 0, totalWithdrawalsKobo: lifetimeDebits._sum.amountKobo ?? 0 }, allocations, withdrawals, permissions: auth.session.user.permissions });
  } catch (error) { return handleApiError(error); }
}
