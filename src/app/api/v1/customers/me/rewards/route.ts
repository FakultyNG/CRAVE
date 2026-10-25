import { connection } from "next/server";
import { apiSession } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { promotionalCreditBalance } from "@/lib/growth/credits";
import { reconcileReferralRewards } from "@/lib/growth/referrals";
import { handleApiError } from "@/lib/api";

export async function GET() { await connection(); try { const auth = await apiSession(); if ("response" in auth) return auth.response; await reconcileReferralRewards(); const db = getDb(); const [balance, entries] = await Promise.all([promotionalCreditBalance(auth.session.user.id), db.promotionalCreditEntry.findMany({ where: { userId: auth.session.user.id }, orderBy: { createdAt: "desc" }, take: 100 })]); return Response.json({ balance, entries }); } catch (error) { return handleApiError(error); } }
