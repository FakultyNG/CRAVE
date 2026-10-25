import "server-only";

import { getDb } from "@/lib/db";

export async function referralConfig() { return getDb().referralProgramConfig.upsert({ where: { id: "default" }, update: {}, create: {} }); }

export async function reconcileReferralRewards(now = new Date()) {
  const db = getDb(); const config = await referralConfig(); if (!config.isActive) return 0;
  const eligible = await db.referral.findMany({ where: { status: "QUALIFIED", rewardEligibleAt: { lte: now }, qualifyingOrder: { status: { in: ["DELIVERED", "COLLECTED"] } } }, select: { id: true, referrerId: true, referredUserId: true } });
  let posted = 0;
  for (const referral of eligible) await db.$transaction(async (tx) => {
    const claimed = await tx.referral.updateMany({ where: { id: referral.id, status: "QUALIFIED" }, data: { status: "REWARDED", rewardedAt: now } }); if (!claimed.count) return;
    const expiresAt = config.creditExpiryDays ? new Date(now.getTime() + config.creditExpiryDays * 86_400_000) : null;
    await tx.promotionalCreditEntry.createMany({ data: [
      { userId: referral.referrerId, type: "CREDIT", amountKobo: config.referrerRewardKobo, description: "Crave Together referral reward", sourceType: "REFERRAL_REFERRER", sourceId: referral.id, expiresAt },
      { userId: referral.referredUserId, type: "CREDIT", amountKobo: config.referredRewardKobo, description: "Crave Together welcome reward", sourceType: "REFERRAL_REFERRED", sourceId: referral.id, expiresAt },
    ], skipDuplicates: true });
    await tx.notification.createMany({ data: [
      { userId: referral.referrerId, type: "REFERRAL_REWARD", title: "Crave Credit received", body: "Your Crave Together referral reward is now available." },
      { userId: referral.referredUserId, type: "REFERRAL_REWARD", title: "Crave Credit received", body: "Your Crave Together welcome credit is now available." },
    ] }); posted += 1;
  });
  return posted;
}
