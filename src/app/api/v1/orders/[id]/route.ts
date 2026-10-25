import { ownedOrder } from "@/lib/commerce/orders";
import { handleApiError, jsonError } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const order = await ownedOrder(id); return order ? Response.json({ order }) : jsonError("Order not found.", 404); }
  catch (error) { return handleApiError(error); }
}
