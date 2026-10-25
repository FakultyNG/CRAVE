import { connection } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

export async function GET() {
  await connection();
  try { const session = await getSession(); if (!session) return jsonError("Authentication required.", 401); const favourites = await getDb().favourite.findMany({ where: { userId: session.user.id }, include: { product: { include: { media: { where: { isCover: true }, take: 1 } } } }, orderBy: { createdAt: "desc" } }); return Response.json({ favourites: favourites.map(({ product }) => ({ slug: product.slug, name: product.name, priceKobo: product.basePriceKobo, image: product.media[0]?.url ?? "" })) }); }
  catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try { const session = await getSession(); if (!session) return jsonError("Authentication required.", 401); const { productSlug } = z.object({ productSlug: z.string().min(1) }).parse(await request.json()); const db = getDb(); const product = await db.product.findUnique({ where: { slug: productSlug } }); if (!product) return jsonError("Product not found.", 404); const key = { userId_productId: { userId: session.user.id, productId: product.id } }; const existing = await db.favourite.findUnique({ where: key }); if (existing) { await db.favourite.delete({ where: key }); return Response.json({ favourite: false }); } await db.favourite.create({ data: key.userId_productId }); return Response.json({ favourite: true }); }
  catch (error) { return handleApiError(error); }
}
