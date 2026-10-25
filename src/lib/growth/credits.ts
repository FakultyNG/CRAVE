import "server-only";

import { getDb } from "@/lib/db";

export async function promotionalCreditBalance(userId: string) {
  const db = getDb(); const now = new Date();
  const [entries, reserved] = await Promise.all([
    db.promotionalCreditEntry.findMany({ where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, select: { type: true, amountKobo: true } }),
    db.promotionalCreditReservation.aggregate({ where: { userId, status: "RESERVED" }, _sum: { amountKobo: true } }),
  ]);
  const ledgerKobo = entries.reduce((sum, item) => sum + (["SPEND", "EXPIRED"].includes(item.type) ? -Math.abs(item.amountKobo) : item.amountKobo), 0);
  const reservedKobo = reserved._sum.amountKobo ?? 0;
  return { ledgerKobo, reservedKobo, availableKobo: Math.max(0, ledgerKobo - reservedKobo) };
}
