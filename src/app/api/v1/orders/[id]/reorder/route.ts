import { ownedOrder } from "@/lib/commerce/orders";
import { activeCart, cartPayload } from "@/lib/commerce/cart";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await ownedOrder(id);
    if (!order) return jsonError("Order not found.", 404);
    const cart = await activeCart(true);
    if (!cart) return jsonError("Unable to start a cart.", 500);
    const db = getDb();
    let added = 0;
    for (const oldItem of order.items) {
      const product = await db.product.findUnique({ where: { id: oldItem.productId }, include: { variants: { where: { isActive: true } }, options: true, availability: true } });
      if (!product || product.status !== "ACTIVE" || !product.availability.some((item) => item.isAvailable)) continue;
      const variant = product.variants.find((item) => item.name === oldItem.variantName) ?? product.variants[0];
      const optionNames = new Set(oldItem.options.map((item) => item.optionName));
      const options = product.options.filter((item) => optionNames.has(item.name));
      await db.cartItem.create({ data: { cartId: cart.id, productId: product.id, variantId: variant?.id, quantity: oldItem.quantity, options: { create: options.map((item) => ({ optionId: item.id })) } } });
      added++;
    }
    if (!added) return jsonError("Those items are not currently available.", 409);
    return Response.json(await cartPayload(cart.id));
  } catch (error) { return handleApiError(error); }
}
