import "server-only";
import { cartOwner } from "./cart";
import { getDb } from "@/lib/db";
import { checkPayment } from "@/lib/payments";
import { postPaidOrder } from "@/lib/accounting/core";

export const orderInclude = { items: { include: { options: true } }, history: { orderBy: { createdAt: "asc" as const } }, payments: { orderBy: { createdAt: "desc" as const }, take: 1 } };

export async function ownedOrder(orderId: string) {
  const owner = await cartOwner();
  return getDb().order.findFirst({ where: { id: orderId, ...(owner.userId ? { userId: owner.userId } : owner.guestTokenHash ? { guestTokenHash: owner.guestTokenHash } : { id: "__none__" }) }, include: orderInclude });
}

export async function verifyPayment(reference: string) {
  const db = getDb();
  const intent = await db.paymentIntent.findFirst({ where: { OR: [{ providerReference: reference }, { merchantReference: reference }] }, include: { order: true } });
  if (!intent) return null;
  if (intent.status === "PAID") {
    await postPaidOrder(intent.orderId);
    return intent;
  }
  const result = await checkPayment(intent.providerReference);
  if (result.amountKobo !== undefined && result.amountKobo !== intent.amountKobo) throw new Error("Payment amount did not match the order total.");
  if (result.currency && result.currency.toUpperCase() !== intent.currency) throw new Error("Payment currency did not match the order currency.");
  const status = result.status === "paid" ? "PAID" : result.status === "failed" ? "FAILED" : result.status === "cancelled" ? "CANCELLED" : "PENDING";
  const updatedIntent = await db.$transaction(async (tx) => {
    const claimed = await tx.paymentIntent.updateMany({ where: { id: intent.id, status: { not: "PAID" } }, data: { status, providerResponse: result.raw as never, verifiedAt: new Date() } });
    if (!claimed.count) return tx.paymentIntent.findUniqueOrThrow({ where: { id: intent.id } });
    await tx.paymentEvent.create({ data: { paymentIntentId: intent.id, type: "STATUS_CHECK", payload: result.raw as never } });
    if (status === "PAID") {
      const orderUpdated = await tx.order.updateMany({ where: { id: intent.orderId, status: { not: "PAYMENT_CONFIRMED" } }, data: { status: "PAYMENT_CONFIRMED", paidAt: new Date() } });
      if (orderUpdated.count) await tx.orderStatusHistory.create({ data: { orderId: intent.orderId, status: "PAYMENT_CONFIRMED", note: "Payment verified by provider status check." } });
      const reservation = await tx.promotionalCreditReservation.findUnique({ where: { orderId: intent.orderId } });
      if (reservation?.status === "RESERVED") { await tx.promotionalCreditEntry.upsert({ where: { sourceType_sourceId_type: { sourceType: "ORDER", sourceId: intent.orderId, type: "SPEND" } }, update: {}, create: { userId: reservation.userId, type: "SPEND", amountKobo: reservation.amountKobo, description: `Crave Credit used on order ${intent.order.orderNumber}`, sourceType: "ORDER", sourceId: intent.orderId } }); await tx.promotionalCreditReservation.update({ where: { id: reservation.id }, data: { status: "CONSUMED" } }); }
      if (intent.order.userId && orderUpdated.count) { const config = await tx.referralProgramConfig.upsert({ where: { id: "default" }, update: {}, create: {} }); const paidOrders = await tx.order.count({ where: { userId: intent.order.userId, paidAt: { not: null } } }); if (config.isActive && paidOrders === 1 && intent.order.subtotalKobo >= config.minimumOrderKobo) { const qualifiedAt = new Date(); await tx.referral.updateMany({ where: { referredUserId: intent.order.userId, status: "PENDING" }, data: { status: "QUALIFIED", qualifyingOrderId: intent.orderId, qualifiedAt, rewardEligibleAt: new Date(qualifiedAt.getTime() + config.verificationDelayDays * 86_400_000) } }); } }
      if (intent.order.cartId) await tx.cart.update({ where: { id: intent.order.cartId }, data: { status: "CONVERTED" } });
    } else if (status === "FAILED" || status === "CANCELLED") {
      const orderUpdated = await tx.order.updateMany({ where: { id: intent.orderId, status: { not: "PAYMENT_FAILED" } }, data: { status: "PAYMENT_FAILED" } });
      if (orderUpdated.count) await tx.orderStatusHistory.create({ data: { orderId: intent.orderId, status: "PAYMENT_FAILED", note: "Payment provider reported a failed transaction." } });
      await tx.promotionalCreditReservation.updateMany({ where: { orderId: intent.orderId, status: "RESERVED" }, data: { status: "RELEASED" } });
      await tx.couponRedemption.deleteMany({ where: { orderId: intent.orderId } });
    }
    return tx.paymentIntent.findUniqueOrThrow({ where: { id: intent.id } });
  });
  if (updatedIntent.status === "PAID") await postPaidOrder(intent.orderId);
  return updatedIntent;
}

export async function completeCreditFundedOrder(orderId: string, paymentIntentId: string) {
  const db = getDb();
  const order = await db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.totalKobo !== 0 || !order.userId) throw new Error("Only authenticated, fully credit-funded orders can use this settlement path.");
    const claimed = await tx.order.updateMany({ where: { id: orderId, paidAt: null }, data: { status: "PAYMENT_CONFIRMED", paidAt: new Date() } });
    if (!claimed.count) return order;
    await tx.paymentIntent.update({ where: { id: paymentIntentId }, data: { status: "PAID", verifiedAt: new Date(), events: { create: { type: "CREDIT_SETTLEMENT", payload: { amountKobo: 0 } } } } });
    await tx.orderStatusHistory.create({ data: { orderId, status: "PAYMENT_CONFIRMED", note: "Order paid fully with Crave Credit." } });
    const reservation = await tx.promotionalCreditReservation.findUniqueOrThrow({ where: { orderId } });
    await tx.promotionalCreditEntry.upsert({ where: { sourceType_sourceId_type: { sourceType: "ORDER", sourceId: orderId, type: "SPEND" } }, update: {}, create: { userId: order.userId, type: "SPEND", amountKobo: reservation.amountKobo, description: `Crave Credit used on order ${order.orderNumber}`, sourceType: "ORDER", sourceId: orderId } });
    await tx.promotionalCreditReservation.update({ where: { id: reservation.id }, data: { status: "CONSUMED" } });
    if (order.cartId) await tx.cart.update({ where: { id: order.cartId }, data: { status: "CONVERTED" } });
    const config = await tx.referralProgramConfig.upsert({ where: { id: "default" }, update: {}, create: {} }); const paidOrders = await tx.order.count({ where: { userId: order.userId, paidAt: { not: null } } });
    if (config.isActive && paidOrders === 1 && order.subtotalKobo >= config.minimumOrderKobo) { const qualifiedAt = new Date(); await tx.referral.updateMany({ where: { referredUserId: order.userId, status: "PENDING" }, data: { status: "QUALIFIED", qualifyingOrderId: orderId, qualifiedAt, rewardEligibleAt: new Date(qualifiedAt.getTime() + config.verificationDelayDays * 86_400_000) } }); }
    return tx.order.findUniqueOrThrow({ where: { id: orderId } });
  });
  await postPaidOrder(orderId);
  return order;
}
