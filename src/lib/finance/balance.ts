import "server-only";
import { getDb } from "@/lib/db";

const reservingStatuses = ["REQUESTED", "PENDING_APPROVAL", "APPROVED", "PROCESSING"] as const;
export async function ownerBalance(ownerId: string) {
  const db = getDb();
  const [ledger, reserved] = await Promise.all([
    db.ownerLedgerEntry.findMany({ where: { ownerId }, select: { type: true, amountKobo: true } }),
    db.withdrawalRequest.aggregate({ where: { ownerId, status: { in: [...reservingStatuses] } }, _sum: { amountKobo: true } }),
  ]);
  const approvedKobo = ledger.reduce((sum, entry) => sum + (entry.type === "DEBIT" ? -Math.abs(entry.amountKobo) : entry.amountKobo), 0);
  const reservedKobo = reserved._sum.amountKobo ?? 0;
  return { approvedKobo, reservedKobo, availableKobo: Math.max(0, approvedKobo - reservedKobo) };
}
