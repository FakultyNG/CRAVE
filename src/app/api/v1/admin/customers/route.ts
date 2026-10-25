import { connection } from "next/server";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET(request: Request) {
  await connection();
  try { const auth = await apiPermission("customers.read"); if ("response" in auth) return auth.response; const query = new URL(request.url).searchParams.get("q")?.trim(); const customers = await getDb().user.findMany({ where: { staffProfile: null, ...(query ? { OR: [{ preferredName: { contains: query, mode: "insensitive" } }, { phone: { contains: query } }] } : {}) }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, preferredName: true, phone: true, email: true, status: true, createdAt: true, _count: { select: { orders: true } }, orders: { where: { paidAt: { not: null } }, select: { totalKobo: true } } } }); return Response.json({ customers: customers.map((customer) => ({ ...customer, lifetimeSpendKobo: customer.orders.reduce((sum, order) => sum + order.totalKobo, 0), orders: undefined })) }); }
  catch (error) { return handleApiError(error); }
}
