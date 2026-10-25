import "server-only";

import { getDb } from "@/lib/db";
import { postJournal } from "@/lib/accounting/core";
import { ownershipWeights } from "./ownership";

type CalculationInput = { periodId: string; retainedEarningsKobo: number; reserveKobo: number; otherAdjustmentsKobo: number; ownershipPolicy?: "PERIOD_END" | "WEIGHTED_DAILY"; notes?: string; actorUserId: string };

export function allocateByLargestRemainder(distributableKobo: number, weights: { ownerId: string; weightPpm: number }[]) {
  const totalWeight = weights.reduce((sum, item) => sum + item.weightPpm, 0);
  const target = Math.floor(distributableKobo * Math.min(totalWeight, 1_000_000) / 1_000_000);
  const rows = weights.map((item) => { const numerator = distributableKobo * item.weightPpm; return { ...item, amountKobo: Math.floor(numerator / 1_000_000), remainder: numerator % 1_000_000 }; });
  let remainderKobo = target - rows.reduce((sum, item) => sum + item.amountKobo, 0);
  for (const row of [...rows].sort((a, b) => b.remainder - a.remainder || a.ownerId.localeCompare(b.ownerId))) { if (remainderKobo <= 0) break; row.amountKobo += 1; remainderKobo -= 1; }
  return { allocations: rows, allocatedProfitKobo: target, unallocatedProfitKobo: distributableKobo - target, roundingRemainderKobo: target - rows.reduce((sum, item) => sum + Math.floor(distributableKobo * item.weightPpm / 1_000_000), 0) };
}

export async function calculatePeriodProfit(input: CalculationInput) {
  const db = getDb();
  const existing = await db.profitCalculation.findFirst({ where: { periodId: input.periodId }, orderBy: { revision: "desc" }, include: { allocations: { include: { owner: { include: { user: true } } } } } });
  if (existing && !["REJECTED", "REVERSED"].includes(existing.status)) return existing;
  const period = await db.financialPeriod.findUnique({ where: { id: input.periodId } });
  if (!period || period.status !== "CLOSED") throw new Error("Profit can only be calculated for a closed accounting period.");
  const snapshot = period.reportSnapshot as { totals?: { netProfitKobo?: number } } | null;
  if (typeof snapshot?.totals?.netProfitKobo !== "number") throw new Error("The closed period does not contain a final profit snapshot.");
  const records = await db.ownershipRecord.findMany({ where: { effectiveAt: { lte: period.endsAt } }, orderBy: { effectiveAt: "asc" } });
  const changedMidPeriod = records.some((record) => record.effectiveAt > period.startsAt && record.effectiveAt <= period.endsAt);
  if (changedMidPeriod && !input.ownershipPolicy) throw new Error("Ownership changed during this period. Choose and approve an allocation policy explicitly.");
  const ownershipPolicy = input.ownershipPolicy ?? "PERIOD_END";
  const weights = ownershipWeights(records, period.startsAt, period.endsAt, ownershipPolicy);
  const netProfitKobo = snapshot.totals.netProfitKobo;
  const distributableProfitKobo = Math.max(0, netProfitKobo - input.retainedEarningsKobo - input.reserveKobo + input.otherAdjustmentsKobo);
  const allocation = allocateByLargestRemainder(distributableProfitKobo, weights);
  return db.$transaction(async (tx) => {
    const calculation = await tx.profitCalculation.create({ data: { periodId: period.id, revision: (existing?.revision ?? 0) + 1, ownershipPolicy, netProfitKobo, retainedEarningsKobo: input.retainedEarningsKobo, reserveKobo: input.reserveKobo, otherAdjustmentsKobo: input.otherAdjustmentsKobo, distributableProfitKobo, allocatedProfitKobo: allocation.allocatedProfitKobo, unallocatedProfitKobo: allocation.unallocatedProfitKobo, roundingRemainderKobo: allocation.roundingRemainderKobo, notes: input.notes, calculatedById: input.actorUserId, allocations: { create: allocation.allocations.map((item) => ({ ownerId: item.ownerId, ownershipWeightPpm: item.weightPpm, amountKobo: item.amountKobo })) } }, include: { allocations: { include: { owner: { include: { user: true } } } } } });
    await tx.auditLog.create({ data: { actorUserId: input.actorUserId, action: "profit.calculate", entityType: "ProfitCalculation", entityId: calculation.id, metadata: { periodId: period.id, ownershipPolicy, distributableProfitKobo } } });
    return calculation;
  });
}

export async function reverseProfitCalculation(calculationId: string, actorUserId: string, reason: string) {
  const db = getDb(); const calculation = await db.profitCalculation.findUnique({ where: { id: calculationId }, include: { period: true, allocations: true } });
  if (!calculation || calculation.status !== "POSTED") throw new Error("Only a posted profit calculation can be reversed.");
  const posted = calculation.allocations.filter((allocation) => allocation.status === "POSTED" && allocation.amountKobo > 0);
  for (const allocation of posted) {
    const entries = await db.ownerLedgerEntry.findMany({ where: { ownerId: allocation.ownerId }, select: { type: true, amountKobo: true } });
    const balance = entries.reduce((sum, entry) => sum + (entry.type === "DEBIT" ? -Math.abs(entry.amountKobo) : entry.amountKobo), 0);
    if (balance < allocation.amountKobo) throw new Error("This distribution has already been spent and cannot be fully reversed. Post a reviewed adjustment instead.");
  }
  const total = posted.reduce((sum, allocation) => sum + allocation.amountKobo, 0);
  if (total) await postJournal({ sourceType: "PROFIT_DISTRIBUTION_REVERSAL", sourceId: calculation.id, entryDate: new Date(), description: `Reversal of owner distributions for ${calculation.period.monthKey}: ${reason}`, createdById: actorUserId, lines: [{ accountKey: "OWNER_DISTRIBUTIONS_PAYABLE", debitKobo: total }, { accountKey: "OWNER_DISTRIBUTIONS", creditKobo: total }] });
  return db.$transaction(async (tx) => {
    for (const allocation of posted) await tx.ownerLedgerEntry.upsert({ where: { sourceType_sourceId_type: { sourceType: "PROFIT_ALLOCATION_REVERSAL", sourceId: allocation.id, type: "DEBIT" } }, update: {}, create: { ownerId: allocation.ownerId, type: "DEBIT", amountKobo: allocation.amountKobo, description: `${calculation.period.monthKey} profit allocation reversal`, sourceType: "PROFIT_ALLOCATION_REVERSAL", sourceId: allocation.id } });
    await tx.profitAllocation.updateMany({ where: { calculationId, status: "POSTED" }, data: { status: "REVERSED" } });
    const updated = await tx.profitCalculation.update({ where: { id: calculationId }, data: { status: "REVERSED" } });
    await tx.auditLog.create({ data: { actorUserId, action: "profit.reverse", entityType: "ProfitCalculation", entityId: calculationId, metadata: { reason, amountKobo: total } } });
    return updated;
  });
}

export async function approveProfitCalculation(calculationId: string, actorUserId: string, approved: boolean, note?: string) {
  const db = getDb(); const calculation = await db.profitCalculation.findUnique({ where: { id: calculationId } });
  if (!calculation) throw new Error("Profit calculation not found.");
  if (calculation.calculatedById === actorUserId) throw new Error("The calculator cannot approve their own profit distribution.");
  if (calculation.status !== "CALCULATED") throw new Error("This profit calculation is no longer awaiting approval.");
  return db.$transaction(async (tx) => {
    await tx.profitApproval.create({ data: { calculationId, approverUserId: actorUserId, approved, note } });
    const updated = await tx.profitCalculation.update({ where: { id: calculationId }, data: approved ? { status: "APPROVED", approvedAt: new Date() } : { status: "REJECTED", rejectedAt: new Date() } });
    await tx.auditLog.create({ data: { actorUserId, action: approved ? "profit.approve" : "profit.reject", entityType: "ProfitCalculation", entityId: calculationId, metadata: { note } } });
    return updated;
  });
}

export async function postProfitCalculation(calculationId: string, actorUserId: string) {
  const db = getDb(); const calculation = await db.profitCalculation.findUnique({ where: { id: calculationId }, include: { period: true, allocations: true } });
  if (!calculation) throw new Error("Profit calculation not found.");
  if (calculation.status === "POSTED") return calculation;
  if (calculation.status !== "APPROVED") throw new Error("Only an approved profit calculation can be posted.");
  const postable = calculation.allocations.filter((item) => item.status === "PENDING" && item.amountKobo > 0);
  if (postable.length) await postJournal({ sourceType: "PROFIT_DISTRIBUTION", sourceId: calculation.id, entryDate: new Date(), description: `Owner distributions for ${calculation.period.monthKey}`, createdById: actorUserId, lines: [{ accountKey: "OWNER_DISTRIBUTIONS", debitKobo: postable.reduce((sum, item) => sum + item.amountKobo, 0) }, { accountKey: "OWNER_DISTRIBUTIONS_PAYABLE", creditKobo: postable.reduce((sum, item) => sum + item.amountKobo, 0) }] });
  return db.$transaction(async (tx) => {
    for (const allocation of postable) await tx.ownerLedgerEntry.upsert({ where: { sourceType_sourceId_type: { sourceType: "PROFIT_ALLOCATION", sourceId: allocation.id, type: "CREDIT" } }, update: {}, create: { ownerId: allocation.ownerId, type: "CREDIT", amountKobo: allocation.amountKobo, description: `${calculation.period.monthKey} approved Crave Profit Split`, sourceType: "PROFIT_ALLOCATION", sourceId: allocation.id } });
    await tx.profitAllocation.updateMany({ where: { calculationId, status: "PENDING" }, data: { status: "POSTED", postedAt: new Date() } });
    const updated = await tx.profitCalculation.update({ where: { id: calculationId }, data: { status: "POSTED", postedAt: new Date() }, include: { allocations: true, period: true } });
    await tx.auditLog.create({ data: { actorUserId, action: "profit.post", entityType: "ProfitCalculation", entityId: calculationId, metadata: { postedAllocations: postable.length, amountKobo: postable.reduce((sum, item) => sum + item.amountKobo, 0) } } });
    return updated;
  });
}
