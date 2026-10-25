import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET() {
  await connection();
  try {
    const products = await getDb().product.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, include: { variants: { where: { isActive: true }, orderBy: { position: "asc" } }, options: { orderBy: { position: "asc" } }, media: { orderBy: { position: "asc" } } } });
    return Response.json({ products });
  } catch (error) { return handleApiError(error); }
}
