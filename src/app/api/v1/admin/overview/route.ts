import { connection } from "next/server";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET() {
  await connection();
  try {
    const auth = await apiPermission("orders.read"); if ("response" in auth) return auth.response;
    const db = getDb(); const start = new Date(); start.setHours(0, 0, 0, 0);
    const [paid, pending, revenue, customers, products, recent] = await Promise.all([
      db.order.count({ where: { paidAt: { gte: start } } }), db.order.count({ where: { status: { in: ["PAYMENT_CONFIRMED", "ACCEPTED", "PREPARING", "READY", "READY_FOR_PICKUP"] } } }),
      db.order.aggregate({ where: { paidAt: { gte: start } }, _sum: { totalKobo: true }, _avg: { totalKobo: true } }), db.user.count({ where: { status: "ACTIVE", staffProfile: null } }), db.product.count({ where: { status: "ACTIVE" } }),
      db.order.findMany({ take: 6, orderBy: { createdAt: "desc" }, select: { id: true, orderNumber: true, customerName: true, status: true, totalKobo: true, createdAt: true } }),
    ]);
    return Response.json({ metrics: { revenueKobo: revenue._sum.totalKobo ?? 0, paidOrders: paid, activeOrders: pending, averageOrderKobo: Math.round(revenue._avg.totalKobo ?? 0), customers, activeProducts: products }, recent });
  } catch (error) { return handleApiError(error); }
}
