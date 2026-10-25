import { connection } from "next/server";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET(request: Request) {
  await connection();
  try {
    const auth = await apiPermission("orders.read"); if ("response" in auth) return auth.response;
    const url = new URL(request.url); const query = url.searchParams.get("q")?.trim(); const status = url.searchParams.get("status");
    const orders = await getDb().order.findMany({ where: { ...(status && status !== "ALL" ? { status: status as never } : {}), ...(query ? { OR: [{ orderNumber: { contains: query, mode: "insensitive" } }, { customerName: { contains: query, mode: "insensitive" } }, { customerPhone: { contains: query } }] } : {}) }, orderBy: { createdAt: "desc" }, take: 100, include: { items: { include: { options: true } }, fulfillment: true } });
    return Response.json({ orders });
  } catch (error) { return handleApiError(error); }
}
