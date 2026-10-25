import { z } from "zod";
import { cartPayload, ownedCartItem } from "@/lib/commerce/cart";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

const updateSchema = z.object({ quantity: z.number().int().min(1).max(20) });

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const item = await ownedCartItem(itemId);
    if (!item) return jsonError("Cart item not found.", 404);
    const { quantity } = updateSchema.parse(await request.json());
    await getDb().cartItem.update({ where: { id: item.id }, data: { quantity } });
    return Response.json(await cartPayload(item.cartId));
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const item = await ownedCartItem(itemId);
    if (!item) return jsonError("Cart item not found.", 404);
    await getDb().cartItem.delete({ where: { id: item.id } });
    return Response.json(await cartPayload(item.cartId));
  } catch (error) { return handleApiError(error); }
}
