import "server-only";

import { getDb } from "@/lib/db";
import { followingSalaryDueAt, salaryPeriodKey } from "./calendar";
import { salaryFundingSource } from "./payroll-settings";

const reservingStatuses = ["REQUESTED", "PENDING_APPROVAL", "APPROVED", "PROCESSING"] as const;

export async function reconcileStaffSalary(staffId: string, now = new Date()) {
  const db = getDb();
  for (let count = 0; count < 120; count += 1) {
    const staff = await db.staffProfile.findUniqueOrThrow({ where: { id: staffId }, select: { salaryKobo: true, nextSalaryAt: true } });
    if (staff.nextSalaryAt > now) return staff.nextSalaryAt;
    const dueAt = staff.nextSalaryAt;
    const nextSalaryAt = followingSalaryDueAt(dueAt);
    const fundingSource = await salaryFundingSource();
    await db.$transaction(async (tx) => {
      const claimed = await tx.staffProfile.updateMany({ where: { id: staffId, nextSalaryAt: dueAt }, data: { nextSalaryAt } });
      if (!claimed.count) return;
      const period = salaryPeriodKey(dueAt);
      await tx.staffWalletEntry.upsert({
        where: { sourceType_sourceId_type: { sourceType: "SALARY", sourceId: `${staffId}:${period}`, type: "SALARY" } },
        update: {},
        create: { staffId, type: "SALARY", amountKobo: staff.salaryKobo, fundingSource, description: `${period} salary`, memo: fundingSource === "PREFUNDED_CAPITAL" ? `Monthly salary for ${period} — paid from prefunded capital; not deducted from gross revenue` : `Monthly salary for ${period} — deducted from gross revenue`, sourceType: "SALARY", sourceId: `${staffId}:${period}` },
      });
      if (fundingSource === "GROSS_REVENUE") await tx.grossRevenueLedgerEntry.upsert({ where: { sourceType_sourceId: { sourceType: "STAFF_SALARY", sourceId: `${staffId}:${period}` } }, update: {}, create: { amountKobo: staff.salaryKobo, description: `${period} staff salary debit`, sourceType: "STAFF_SALARY", sourceId: `${staffId}:${period}` } });
    });
  }
  throw new Error("Salary schedule requires administrator review.");
}

export async function staffWalletBalance(staffId: string) {
  const db = getDb();
  const [entries, reserved] = await Promise.all([
    db.staffWalletEntry.findMany({ where: { staffId }, select: { type: true, amountKobo: true } }),
    db.staffWithdrawalRequest.aggregate({ where: { staffId, status: { in: [...reservingStatuses] } }, _sum: { amountKobo: true } }),
  ]);
  const earnedKobo = entries.reduce((sum, entry) => sum + (entry.type === "WITHDRAWAL" ? -Math.abs(entry.amountKobo) : entry.amountKobo), 0);
  const reservedKobo = reserved._sum.amountKobo ?? 0;
  return { earnedKobo, reservedKobo, availableKobo: Math.max(0, earnedKobo - reservedKobo) };
}
