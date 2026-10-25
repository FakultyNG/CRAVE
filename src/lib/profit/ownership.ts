import "server-only";

import { getDb } from "@/lib/db";

type OwnershipPoint = { ownerId: string; percentageBps: number; effectiveAt: Date };

export function ownershipAt(records: OwnershipPoint[], at: Date) {
  const latest = new Map<string, OwnershipPoint>();
  for (const record of records) {
    if (record.effectiveAt > at) continue;
    const current = latest.get(record.ownerId);
    if (!current || current.effectiveAt < record.effectiveAt) latest.set(record.ownerId, record);
  }
  return [...latest.values()].filter((record) => record.percentageBps > 0);
}

export function totalOwnershipAt(records: OwnershipPoint[], at: Date) {
  return ownershipAt(records, at).reduce((sum, record) => sum + record.percentageBps, 0);
}

export async function validateOwnershipChange(candidate: OwnershipPoint) {
  const db = getDb();
  const latestClosed = await db.financialPeriod.findFirst({ where: { status: "CLOSED" }, orderBy: { endsAt: "desc" } });
  if (latestClosed && candidate.effectiveAt <= latestClosed.endsAt) throw new Error(`Ownership changes must be effective after closed period ${latestClosed.monthKey}.`);
  const existing = await db.ownershipRecord.findMany({ select: { ownerId: true, percentageBps: true, effectiveAt: true } });
  const records = [...existing.filter((record) => !(record.ownerId === candidate.ownerId && record.effectiveAt.getTime() === candidate.effectiveAt.getTime())), candidate];
  const checkpoints = [...new Set(records.filter((record) => record.effectiveAt >= candidate.effectiveAt).map((record) => record.effectiveAt.getTime()))].sort((a, b) => a - b);
  for (const timestamp of checkpoints) {
    if (totalOwnershipAt(records, new Date(timestamp)) > 10_000) throw new Error(`Active ownership would exceed 100% on ${new Date(timestamp).toLocaleDateString("en-NG")}.`);
  }
}

export function ownershipWeights(records: OwnershipPoint[], startsAt: Date, endsAt: Date, policy: "PERIOD_END" | "WEIGHTED_DAILY") {
  if (policy === "PERIOD_END") return ownershipAt(records, endsAt).map((record) => ({ ownerId: record.ownerId, weightPpm: record.percentageBps * 100 }));
  const totalMs = endsAt.getTime() - startsAt.getTime() + 1;
  const boundaries = [startsAt.getTime(), ...records.filter((record) => record.effectiveAt > startsAt && record.effectiveAt <= endsAt).map((record) => record.effectiveAt.getTime()), endsAt.getTime() + 1].sort((a, b) => a - b);
  const weighted = new Map<string, number>();
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const segmentStart = boundaries[index]; const duration = boundaries[index + 1] - segmentStart;
    for (const record of ownershipAt(records, new Date(segmentStart))) weighted.set(record.ownerId, (weighted.get(record.ownerId) ?? 0) + record.percentageBps * duration);
  }
  return [...weighted].map(([ownerId, numerator]) => ({ ownerId, weightPpm: Math.round(numerator * 100 / totalMs) })).filter((item) => item.weightPpm > 0);
}
