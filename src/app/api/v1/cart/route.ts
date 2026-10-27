import { connection } from "next/server";
import { z } from "zod";
import { activeCart, cartPayload } from "@/lib/commerce/cart";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { optionSelectionError } from "@/lib/product-config/selections";

const addSchema = z.object({ productSlug: z.string().min(1), variantName: z.string().optional(), optionNames: z.array(z.string()).max(20).default([]), quantity: z.number().int().min(1).max(20).default(1) });

export async function GET() {
  await connection();
  try {
    const cart = await activeCart();
    return Response.json(cart ? await cartPayload(cart.id) : { id: null, items: [], itemCount: 0, subtotalKobo: 0 });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const input = addSchema.parse(await request.json());
    const db = getDb();
    const product = await db.product.findUnique({ where: { slug: input.productSlug }, include: { variants: { where: { isActive: true } }, options: true, availability: true } });
    if (!product || product.status !== "ACTIVE" || !product.availability.some((entry) => entry.isAvailable)) return jsonError("This item is not currently available.", 409);
    const variant = input.variantName ? product.variants.find((entry) => entry.name === input.variantName) : product.variants[0];
    if (input.variantName && !variant) return jsonError("That size is no longer available.", 409);
    const selectedOptions = product.options.filter((option) => input.optionNames.includes(option.name));
    if (selectedOptions.length !== new Set(input.optionNames).size) return jsonError("One of those options is no longer available.", 409);
    const selectionError = optionSelectionError(product.options, input.optionNames);
    if (selectionError) return jsonError(selectionError, 422);
    const cart = await activeCart(true);
    if (!cart) return jsonError("Unable to start a cart.", 500);
    const item = await db.cartItem.create({ data: { cartId: cart.id, productId: product.id, variantId: variant?.id, quantity: input.quantity, options: { create: selectedOptions.map((option) => ({ optionId: option.id })) } } });
    await db.cart.update({ where: { id: cart.id }, data: { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
    return Response.json(await cartPayload(cart.id), { status: 201, headers: { "x-cart-item": item.id } });
  } catch (error) { return handleApiError(error); }
}
