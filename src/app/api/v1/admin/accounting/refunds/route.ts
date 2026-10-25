import { connection } from "next/server";
import { z } from "zod";
import { apiSession } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { postJournal } from "@/lib/accounting/core";

function mayRefund(permissions: string[]) { return permissions.includes("orders.refund") || permissions.includes("accounting.manage"); }

export async function GET() { await connection(); try { const auth = await apiSession(); if ("response" in auth) return auth.response; if (!mayRefund(auth.session.user.permissions) && !auth.session.user.permissions.includes("accounting.read")) return jsonError("You do not have permission to view refunds.", 403); return Response.json({ refunds: await getDb().refund.findMany({ include: { order: true, requestedBy: { select: { preferredName: true } }, approvedBy: { select: { preferredName: true } } }, orderBy: { requestedAt: "desc" }, take: 250 }) }); } catch (error) { return handleApiError(error); } }

export async function POST(request: Request) {
  try { const auth = await apiSession(); if ("response" in auth) return auth.response; if (!mayRefund(auth.session.user.permissions)) return jsonError("You do not have permission to request refunds.", 403); const input = z.object({ orderId: z.string(), amountKobo: z.number().int().positive(), reason: z.string().trim().min(5).max(300) }).parse(await request.json()); const db = getDb(); const order = await db.order.findUnique({ where: { id: input.orderId }, include: { payments: { where: { status: "PAID" }, take: 1 } } }); if (!order?.paidAt) return jsonError("Only paid orders can be refunded.", 409); const alreadyRefunded = await db.refund.aggregate({ where: { orderId: order.id, status: { in: ["REQUESTED", "APPROVED", "PROCESSING", "PAID"] } }, _sum: { amountKobo: true } }); if ((alreadyRefunded._sum.amountKobo ?? 0) + input.amountKobo > order.totalKobo) return jsonError("Refund total exceeds the amount paid.", 409); const refund = await db.$transaction(async (tx) => { const created = await tx.refund.create({ data: { ...input, paymentIntentId: order.payments[0]?.id, requestedById: auth.session.user.id } }); await tx.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "accounting.refund.request", entityType: "Refund", entityId: created.id, metadata: { orderId: order.id, amountKobo: input.amountKobo } } }); return created; }); return Response.json({ refund }, { status: 201 }); } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const auth = await apiSession(); if ("response" in auth) return auth.response; if (!mayRefund(auth.session.user.permissions)) return jsonError("You do not have permission to approve refunds.", 403);
    const input = z.object({ refundId: z.string(), status: z.enum(["APPROVED", "REJECTED", "PAID"]), providerReference: z.string().trim().optional() }).parse(await request.json()); const db = getDb(); const refund = await db.refund.findUnique({ where: { id: input.refundId }, include: { order: true } }); if (!refund) return jsonError("Refund not found.", 404); if (refund.requestedById === auth.session.user.id && input.status !== "REJECTED") return jsonError("A different authorised staff member must approve this refund.", 403);
    const allowed = refund.status === "REQUESTED" ? ["APPROVED", "REJECTED"] : refund.status === "APPROVED" ? ["PAID"] : [];
    if (!allowed.includes(input.status)) return jsonError("Invalid refund state transition.", 409);
    const updated = await db.$transaction(async (tx) => { const item = await tx.refund.update({ where: { id: refund.id }, data: { status: input.status, providerReference: input.providerReference, approvedById: input.status === "APPROVED" ? auth.session.user.id : refund.approvedById, approvedAt: input.status === "APPROVED" ? new Date() : refund.approvedAt, paidAt: input.status === "PAID" ? new Date() : null } }); await tx.auditLog.create({ data: { actorUserId: auth.session.user.id, action: `accounting.refund.${input.status.toLowerCase()}`, entityType: "Refund", entityId: refund.id, metadata: { providerReference: input.providerReference } } }); return item; });
    if (updated.status === "PAID") { await postJournal({ sourceType: "REFUND", sourceId: updated.id, entryDate: updated.paidAt!, description: `Refund for order ${refund.order.orderNumber}`, createdById: auth.session.user.id, lines: [{ accountKey: "SALES_RETURNS", debitKobo: updated.amountKobo, locationId: refund.order.locationId, orderId: refund.orderId }, { accountKey: "BANK", creditKobo: updated.amountKobo, locationId: refund.order.locationId, orderId: refund.orderId }] }); const paidRefunds = await db.refund.aggregate({ where: { orderId: refund.orderId, status: "PAID" }, _sum: { amountKobo: true } }); if ((paidRefunds._sum.amountKobo ?? 0) >= refund.order.totalKobo) await db.$transaction([db.order.update({ where: { id: refund.orderId }, data: { status: "REFUNDED" } }), db.paymentIntent.updateMany({ where: { orderId: refund.orderId, status: "PAID" }, data: { status: "REFUNDED" } })]); }
    return Response.json({ refund: updated });
  } catch (error) { return handleApiError(error); }
}
