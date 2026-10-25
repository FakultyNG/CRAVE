import { connection } from "next/server";
import { apiSession } from "@/lib/auth/api";
import { randomToken } from "@/lib/auth/crypto";
import { getDb } from "@/lib/db";
import { referralConfig, reconcileReferralRewards } from "@/lib/growth/referrals";
import { handleApiError } from "@/lib/api";

export async function GET(request: Request) { await connection(); try { const auth = await apiSession(); if ("response" in auth) return auth.response; await reconcileReferralRewards(); const db = getDb(); let user = await db.user.findUniqueOrThrow({ where: { id: auth.session.user.id }, select: { referralCode: true } }); if (!user.referralCode) user = await db.user.update({ where: { id: auth.session.user.id }, data: { referralCode: `CRV${randomToken(5).toUpperCase()}` }, select: { referralCode: true } }); const [config, referrals] = await Promise.all([referralConfig(), db.referral.findMany({ where: { referrerId: auth.session.user.id }, include: { referredUser: { select: { preferredName: true } }, qualifyingOrder: { select: { orderNumber: true, subtotalKobo: true } } }, orderBy: { createdAt: "desc" } })]); const origin = new URL(request.url).origin; return Response.json({ code: user.referralCode, link: `${origin}/login?ref=${user.referralCode}`, config, referrals, stats: { invitations: referrals.length, qualified: referrals.filter((item) => ["QUALIFIED", "REWARDED"].includes(item.status)).length, rewarded: referrals.filter((item) => item.status === "REWARDED").length } }); } catch (error) { return handleApiError(error); } }
