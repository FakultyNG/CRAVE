import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { handleApiError } from "@/lib/api";
import { calculatePeriodProfit } from "@/lib/profit/engine";

export async function POST(request: Request) { try { const auth = await apiPermission("profit.calculate"); if ("response" in auth) return auth.response; const input = z.object({ periodId: z.string(), retainedEarningsKobo: z.number().int().min(0), reserveKobo: z.number().int().min(0), otherAdjustmentsKobo: z.number().int(), ownershipPolicy: z.enum(["PERIOD_END", "WEIGHTED_DAILY"]).optional(), notes: z.string().trim().max(500).optional() }).parse(await request.json()); return Response.json({ calculation: await calculatePeriodProfit({ ...input, actorUserId: auth.session.user.id }) }, { status: 201 }); } catch (error) { return handleApiError(error); } }
