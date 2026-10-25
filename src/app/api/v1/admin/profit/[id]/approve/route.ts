import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { handleApiError } from "@/lib/api";
import { approveProfitCalculation } from "@/lib/profit/engine";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const auth = await apiPermission("profit.approve"); if ("response" in auth) return auth.response; const input = z.object({ approved: z.boolean(), note: z.string().trim().max(500).optional() }).parse(await request.json()); const { id } = await params; return Response.json({ calculation: await approveProfitCalculation(id, auth.session.user.id, input.approved, input.note) }); } catch (error) { return handleApiError(error); } }
