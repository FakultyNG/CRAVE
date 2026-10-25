import { z } from "zod";
import { activeCart, cartPayload } from "@/lib/commerce/cart";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { validateCoupon } from "@/lib/growth/coupons";
import { promotionalCreditBalance } from "@/lib/growth/credits";

const schema = z.object({ fulfillmentType: z.enum(["DELIVERY", "PICKUP"]), deliveryZoneSlug: z.string().optional(), couponCode: z.string().trim().max(32).optional(), useCredits: z.boolean().default(false) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const cart = await activeCart();
    if (!cart) return jsonError("Your cart is empty.", 409);
    const payload = await cartPayload(cart.id);
    if (!payload.items.length) return jsonError("Your cart is empty.", 409);
    const db = getDb(); const location = await db.location.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } }); if (!location) return jsonError("Ordering is temporarily unavailable.", 503);
    const zone = input.fulfillmentType === "DELIVERY" ? await db.deliveryZone.findFirst({ where: { slug: input.deliveryZoneSlug, locationId: location.id, isActive: true } }) : null;
    if (input.fulfillmentType === "DELIVERY" && !zone) return jsonError("Choose an available delivery area.", 422);
    if (zone && payload.subtotalKobo < zone.minimumOrderKobo) return jsonError(`The minimum order for ${zone.name} has not been reached.`, 409);
    const cartItems = await db.cartItem.findMany({ where: { cartId: cart.id }, include: { product: { select: { categoryId: true } } } });
    let coupon = null; try { coupon = await validateCoupon({ code: input.couponCode, userId: cart.userId, locationId: location.id, subtotalKobo: payload.subtotalKobo, items: cartItems.map((item) => ({ productId: item.productId, categoryId: item.product.categoryId, lineTotalKobo: payload.items.find((line) => line.id === item.id)?.lineTotalKobo ?? 0 })) }); } catch (error) { return jsonError(error instanceof Error ? error.message : "Coupon is invalid.", 422); }
    if (input.useCredits && coupon && !coupon.coupon.combinableWithCredit) return jsonError("This coupon cannot be combined with Crave Credit.", 409);
    const creditBalance = cart.userId ? await promotionalCreditBalance(cart.userId) : { availableKobo: 0, ledgerKobo: 0, reservedKobo: 0 };
    const promotionalCreditKobo = input.useCredits ? Math.min(creditBalance.availableKobo, payload.subtotalKobo - (coupon?.discountKobo ?? 0)) : 0;
    const deliveryFeeKobo = zone?.feeKobo ?? 0; const discountKobo = (coupon?.discountKobo ?? 0) + promotionalCreditKobo;
    return Response.json({ ...payload, fulfillmentType: input.fulfillmentType, coupon: coupon && { code: coupon.coupon.code, name: coupon.coupon.name, discountKobo: coupon.discountKobo }, creditBalanceKobo: creditBalance.availableKobo, promotionalCreditKobo, discountKobo, deliveryFeeKobo, totalKobo: payload.subtotalKobo - discountKobo + deliveryFeeKobo, estimatedMinutes: zone?.estimatedMinutes ?? 25, deliveryZone: zone && { name: zone.name, slug: zone.slug } });
  } catch (error) { return handleApiError(error); }
}
