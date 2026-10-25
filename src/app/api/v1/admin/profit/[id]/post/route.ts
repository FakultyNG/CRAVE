import { apiPermission } from "@/lib/auth/api";
import { handleApiError } from "@/lib/api";
import { postProfitCalculation } from "@/lib/profit/engine";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) { try { const auth = await apiPermission("profit.approve"); if ("response" in auth) return auth.response; const { id } = await params; return Response.json({ calculation: await postProfitCalculation(id, auth.session.user.id) }); } catch (error) { return handleApiError(error); } }
