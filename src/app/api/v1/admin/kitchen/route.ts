import { connection } from "next/server";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api";
import { kitchenStatuses } from "@/lib/operations/order-status";

export async function GET(request: Request) {
  await connection();
  try {
    const auth = await apiPermission("orders.read"); if ("response" in auth) return auth.response;
    const afterValue = new URL(request.url).searchParams.get("after"); const after = afterValue ? new Date(afterValue) : new Date(Date.now() - 60_000); const safeAfter = Number.isNaN(after.getTime()) ? new Date(Date.now() - 60_000) : after;
    const db = getDb(); const [orders, newOrders] = await Promise.all([
      db.order.findMany({ where: { status: { in: kitchenStatuses } }, orderBy: { paidAt: "asc" }, include: { items: { include: { options: true } }, fulfillment: true } }),
      db.order.findMany({ where: { status: { in: kitchenStatuses }, paidAt: { gt: safeAfter } }, select: { id: true, orderNumber: true, customerName: true, paidAt: true } }),
    ]);
    return Response.json({ serverTime: new Date().toISOString(), orders, newOrders });
  } catch (error) { return handleApiError(error); }
}
