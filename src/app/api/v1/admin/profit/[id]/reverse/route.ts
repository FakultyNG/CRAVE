import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { handleApiError } from "@/lib/api";
import { reverseProfitCalculation } from "@/lib/profit/engine";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const auth = await apiPermission("profit.approve"); if ("response" in auth) return auth.response; const { reason } = z.object({ reason: z.string().trim().min(5).max(500) }).parse(await request.json()); const { id } = await params; return Response.json({ calculation: await reverseProfitCalculation(id, auth.session.user.id, reason) }); } catch (error) { return handleApiError(error); } }
