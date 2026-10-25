import { handleApiError, jsonError } from "@/lib/api";
import { verifyPayment } from "@/lib/commerce/orders";
import { getDb } from "@/lib/db";
import { cartOwner } from "@/lib/commerce/cart";

export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    const owner = await cartOwner();
    const intent = await getDb().paymentIntent.findFirst({ where: { OR: [{ providerReference: reference }, { merchantReference: reference }] }, include: { order: true } });
    if (!intent || (owner.userId ? intent.order.userId !== owner.userId : !owner.guestTokenHash || intent.order.guestTokenHash !== owner.guestTokenHash)) return jsonError("Payment not found.", 404);
    const payment = await verifyPayment(reference);
    if (!payment) return jsonError("Payment not found.", 404);
    const order = await getDb().order.findUnique({ where: { id: payment.orderId }, select: { id: true, orderNumber: true, status: true } });
    return Response.json({ paymentStatus: payment.status, order });
  } catch (error) { return handleApiError(error); }
}
