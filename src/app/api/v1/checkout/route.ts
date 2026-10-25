import { z } from "zod";
import { activeCart, cartOwner } from "@/lib/commerce/cart";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { createCheckout, paymentProvider } from "@/lib/payments";
import { randomToken } from "@/lib/auth/crypto";
import { validateCoupon } from "@/lib/growth/coupons";
import { promotionalCreditBalance } from "@/lib/growth/credits";
import { completeCreditFundedOrder } from "@/lib/commerce/orders";

const schema = z.object({
  fulfillmentType: z.enum(["DELIVERY", "PICKUP"]), deliveryZoneSlug: z.string().optional(),
  customerName: z.string().trim().min(2).max(80), customerPhone: z.string().trim().min(7).max(25), customerEmail: z.email(),
  address: z.object({ line1: z.string().trim().min(4).max(160), area: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(80).default("Lagos"), landmark: z.string().trim().max(120).optional() }).optional(),
  instructions: z.string().trim().max(300).optional(),
  couponCode: z.string().trim().max(32).optional(), useCredits: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    if (input.fulfillmentType === "DELIVERY" && !input.address) return jsonError("A delivery address is required.", 422);
    const cart = await activeCart();
    if (!cart) return jsonError("Your cart is empty.", 409);
    const db = getDb();
    const existingOrder = await db.order.findUnique({ where: { cartId: cart.id }, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (existingOrder?.payments[0]?.checkoutUrl) return Response.json({ orderId: existingOrder.id, orderNumber: existingOrder.orderNumber, reference: existingOrder.payments[0].merchantReference, checkoutUrl: existingOrder.payments[0].checkoutUrl });
    if (existingOrder) return jsonError("A checkout attempt already exists for this cart. Please contact support if payment did not open.", 409);
    const items = await db.cartItem.findMany({ where: { cartId: cart.id }, include: { product: { include: { availability: true, costs: { orderBy: { effectiveFrom: "desc" }, take: 1 } } }, variant: true, options: { include: { option: true } } } });
    if (!items.length) return jsonError("Your cart is empty.", 409);
    if (items.some((item) => item.product.status !== "ACTIVE" || !item.product.availability.some((entry) => entry.isAvailable))) return jsonError("One or more items are no longer available.", 409);
    const location = await db.location.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
    if (!location) return jsonError("Ordering is temporarily unavailable.", 503);
    const zone = input.fulfillmentType === "DELIVERY" ? await db.deliveryZone.findFirst({ where: { slug: input.deliveryZoneSlug, locationId: location.id, isActive: true } }) : null;
    if (input.fulfillmentType === "DELIVERY" && !zone) return jsonError("Choose an available delivery area.", 422);
    const prepared = items.map((item) => { const unitPriceKobo = item.product.basePriceKobo + (item.variant?.priceDeltaKobo ?? 0) + item.options.reduce((sum, selected) => sum + selected.option.priceDeltaKobo, 0); return { item, unitPriceKobo, lineTotalKobo: unitPriceKobo * item.quantity }; });
    const subtotalKobo = prepared.reduce((sum, item) => sum + item.lineTotalKobo, 0);
    if (zone && subtotalKobo < zone.minimumOrderKobo) return jsonError(`The minimum order for ${zone.name} has not been reached.`, 409);
    const owner = await cartOwner();
    let coupon = null; try { coupon = await validateCoupon({ code: input.couponCode, userId: owner.userId, locationId: location.id, subtotalKobo, items: prepared.map(({ item, lineTotalKobo }) => ({ productId: item.productId, categoryId: item.product.categoryId, lineTotalKobo })) }); } catch (error) { return jsonError(error instanceof Error ? error.message : "Coupon is invalid.", 422); }
    if (input.useCredits && coupon && !coupon.coupon.combinableWithCredit) return jsonError("This coupon cannot be combined with Crave Credit.", 409);
    const creditBalance = owner.userId ? await promotionalCreditBalance(owner.userId) : { availableKobo: 0 };
    const promotionalCreditKobo = input.useCredits ? Math.min(creditBalance.availableKobo, subtotalKobo - (coupon?.discountKobo ?? 0)) : 0;
    const couponDiscountKobo = coupon?.discountKobo ?? 0; const discountKobo = couponDiscountKobo + promotionalCreditKobo;
    const totalKobo = subtotalKobo - discountKobo + (zone?.feeKobo ?? 0);
    const orderNumber = `CRV-${Date.now().toString(36).toUpperCase()}-${randomToken(3).toUpperCase()}`;
    const internalReference = `${orderNumber}-${randomToken(6)}`;
    const provider = paymentProvider();
    const order = await db.$transaction(async (tx) => {
      if (owner.userId) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`checkout:user:${owner.userId}`}))`;
      if (coupon) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`checkout:coupon:${coupon.coupon.id}`}))`;
      if (promotionalCreditKobo > 0 && owner.userId) { const [entries, reserved] = await Promise.all([tx.promotionalCreditEntry.findMany({ where: { userId: owner.userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, select: { type: true, amountKobo: true } }), tx.promotionalCreditReservation.aggregate({ where: { userId: owner.userId, status: "RESERVED" }, _sum: { amountKobo: true } })]); const available = Math.max(0, entries.reduce((sum, item) => sum + (["SPEND", "EXPIRED"].includes(item.type) ? -Math.abs(item.amountKobo) : item.amountKobo), 0) - (reserved._sum.amountKobo ?? 0)); if (promotionalCreditKobo > available) throw new Error("Your Crave Credit balance changed. Refresh the quote and try again."); }
      if (coupon) { const [totalUses, customerUses] = await Promise.all([tx.couponRedemption.count({ where: { couponId: coupon.coupon.id } }), owner.userId ? tx.couponRedemption.count({ where: { couponId: coupon.coupon.id, userId: owner.userId } }) : Promise.resolve(0)]); if (coupon.coupon.maximumRedemptions !== null && totalUses >= coupon.coupon.maximumRedemptions) throw new Error("This coupon has reached its redemption limit."); if (owner.userId && customerUses >= coupon.coupon.maximumPerCustomer) throw new Error("You have already used this coupon."); }
      return tx.order.create({
      data: {
        orderNumber, userId: owner.userId, guestTokenHash: owner.guestTokenHash, cartId: cart.id, locationId: location.id, deliveryZoneId: zone?.id,
        status: "PENDING_PAYMENT", fulfillmentType: input.fulfillmentType, customerName: input.customerName, customerPhone: input.customerPhone, customerEmail: input.customerEmail,
        deliveryAddress: input.address as never, deliveryInstructions: input.instructions, subtotalKobo, discountKobo, couponId: coupon?.coupon.id, couponCode: coupon?.coupon.code, couponDiscountKobo, promotionalCreditKobo, deliveryFeeKobo: zone?.feeKobo ?? 0, totalKobo,
        estimatedReadyAt: new Date(Date.now() + (zone?.estimatedMinutes ?? 25) * 60_000),
        items: { create: prepared.map(({ item, unitPriceKobo, lineTotalKobo }) => ({ productId: item.productId, productName: item.product.name, variantName: item.variant?.name, quantity: item.quantity, unitPriceKobo, productionCostKobo: item.product.costs[0]?.costKobo ?? 0, lineTotalKobo, options: { create: item.options.map((selected) => ({ optionName: selected.option.name, priceDeltaKobo: selected.option.priceDeltaKobo })) } })) },
        history: { create: { status: "PENDING_PAYMENT", note: "Checkout created." } },
        payments: { create: { provider, providerReference: internalReference, merchantReference: internalReference, idempotencyKey: `checkout:${cart.id}`, amountKobo: totalKobo, currency: "NGN" } },
        couponRedemption: coupon ? { create: { couponId: coupon.coupon.id, userId: owner.userId, discountKobo: couponDiscountKobo } } : undefined,
        creditReservation: promotionalCreditKobo > 0 && owner.userId ? { create: { userId: owner.userId, amountKobo: promotionalCreditKobo } } : undefined,
      }, include: { payments: true },
      });
    }, { isolationLevel: "Serializable" });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    if (totalKobo === 0) { await completeCreditFundedOrder(order.id, order.payments[0].id); return Response.json({ orderId: order.id, orderNumber: order.orderNumber, reference: internalReference, checkoutUrl: `${appUrl}/checkout/result?reference=${encodeURIComponent(internalReference)}` }); }
    try {
      const result = await createCheckout({ reference: internalReference, amountKobo: totalKobo, currency: "NGN", description: `Crave order ${order.orderNumber}`, customerName: input.customerName, customerEmail: input.customerEmail, callbackUrl: `${appUrl}/api/v1/payments/webhooks/strowallet`, successUrl: `${appUrl}/checkout/result?reference=${encodeURIComponent(internalReference)}`, cancelUrl: `${appUrl}/cart` });
      await db.paymentIntent.update({ where: { id: order.payments[0].id }, data: { providerReference: result.reference, checkoutUrl: result.checkoutUrl, status: "PENDING", providerResponse: result.raw as never, events: { create: { type: "CHECKOUT_CREATED", payload: result.raw as never } } } });
      return Response.json({ orderId: order.id, orderNumber: order.orderNumber, reference: result.reference, checkoutUrl: result.checkoutUrl });
    } catch (error) {
      await db.$transaction([db.paymentIntent.update({ where: { id: order.payments[0].id }, data: { status: "FAILED", events: { create: { type: "CHECKOUT_ERROR", payload: { message: error instanceof Error ? error.message : "Unknown provider error" } } } } }), db.promotionalCreditReservation.updateMany({ where: { orderId: order.id, status: "RESERVED" }, data: { status: "RELEASED" } }), db.couponRedemption.deleteMany({ where: { orderId: order.id } })]);
      throw error;
    }
  } catch (error) { return handleApiError(error); }
}
