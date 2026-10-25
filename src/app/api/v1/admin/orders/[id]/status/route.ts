import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError, requestIp } from "@/lib/api";
import { canTransition } from "@/lib/operations/order-status";
import { reconcileReferralRewards } from "@/lib/growth/referrals";

const schema = z.object({ status: z.enum(["ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "DELIVERED", "COLLECTED", "CANCELLED"]), note: z.string().trim().max(300).optional(), dispatchName: z.string().trim().max(80).optional(), dispatchPhone: z.string().trim().max(25).optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await apiPermission("orders.update"); if ("response" in auth) return auth.response;
    const input = schema.parse(await request.json()); const { id } = await params; const db = getDb(); const order = await db.order.findUnique({ where: { id }, include: { fulfillment: true } });
    if (!order) return jsonError("Order not found.", 404); if (!canTransition(order.status, input.status, order.fulfillmentType)) return jsonError(`Cannot move this order from ${order.status} to ${input.status}.`, 409);
    const staff = await db.staffProfile.findUnique({ where: { userId: auth.session.user.id } }); const now = new Date();
    const result = await db.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id }, data: { status: input.status, history: { create: { status: input.status, note: input.note } }, fulfillment: { upsert: { create: { acceptedById: input.status === "ACCEPTED" ? staff?.id : undefined, acceptedAt: input.status === "ACCEPTED" ? now : undefined, preparationAt: input.status === "PREPARING" ? now : undefined, readyAt: ["READY", "READY_FOR_PICKUP"].includes(input.status) ? now : undefined, dispatchedAt: input.status === "OUT_FOR_DELIVERY" ? now : undefined, completedAt: ["DELIVERED", "COLLECTED"].includes(input.status) ? now : undefined, dispatchName: input.dispatchName, dispatchPhone: input.dispatchPhone, kitchenNote: input.note }, update: { acceptedById: input.status === "ACCEPTED" ? staff?.id : undefined, acceptedAt: input.status === "ACCEPTED" ? now : undefined, preparationAt: input.status === "PREPARING" ? now : undefined, readyAt: ["READY", "READY_FOR_PICKUP"].includes(input.status) ? now : undefined, dispatchedAt: input.status === "OUT_FOR_DELIVERY" ? now : undefined, completedAt: ["DELIVERED", "COLLECTED"].includes(input.status) ? now : undefined, dispatchName: input.dispatchName, dispatchPhone: input.dispatchPhone, kitchenNote: input.note } } } } });
      if (order.userId) await tx.notification.create({ data: { userId: order.userId, type: "ORDER_STATUS", title: `Order ${order.orderNumber}`, body: `Your order is now ${input.status.toLowerCase().replaceAll("_", " ")}.` } });
      if (input.status === "CANCELLED") await tx.referral.updateMany({ where: { qualifyingOrderId: id, status: "QUALIFIED" }, data: { status: "DISQUALIFIED", disqualifiedAt: now, disqualificationReason: "Qualifying order was cancelled." } });
      await tx.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "order.status.update", entityType: "Order", entityId: id, metadata: { from: order.status, to: input.status }, ipAddress: requestIp(request) } });
      return updated;
    });
    if (["DELIVERED", "COLLECTED"].includes(input.status)) await reconcileReferralRewards();
    return Response.json({ order: result });
  } catch (error) { return handleApiError(error); }
}
