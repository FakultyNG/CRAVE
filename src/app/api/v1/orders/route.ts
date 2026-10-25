import { connection } from "next/server";
import { cartOwner } from "@/lib/commerce/cart";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET() {
  await connection();
  try {
    const owner = await cartOwner();
    if (!owner.userId && !owner.guestTokenHash) return Response.json({ orders: [] });
    const orders = await getDb().order.findMany({ where: owner.userId ? { userId: owner.userId } : { guestTokenHash: owner.guestTokenHash! }, orderBy: { createdAt: "desc" }, select: { id: true, orderNumber: true, status: true, fulfillmentType: true, totalKobo: true, createdAt: true, items: { select: { productName: true, quantity: true } } } });
    return Response.json({ orders });
  } catch (error) { return handleApiError(error); }
}
