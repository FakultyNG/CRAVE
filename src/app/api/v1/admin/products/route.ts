import { connection } from "next/server";
import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

const productSchema = z.object({ name: z.string().trim().min(2).max(100), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().trim().min(10).max(1000), basePriceKobo: z.number().int().min(0), preparationMins: z.number().int().min(1).max(240), categorySlug: z.string().default("crave-classics"), allergens: z.array(z.string().max(40)).max(20).default([]), status: z.enum(["DRAFT", "ACTIVE", "UNAVAILABLE"]).default("DRAFT") });

export async function GET() {
  await connection();
  try { const auth = await apiPermission("products.read"); if ("response" in auth) return auth.response; const products = await getDb().product.findMany({ orderBy: { updatedAt: "desc" }, include: { category: true, media: { orderBy: { position: "asc" } }, variants: true, options: true, availability: true, costs: { orderBy: { effectiveFrom: "desc" }, take: 1 } } }); return Response.json({ products }); }
  catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try { const auth = await apiPermission("products.create"); if ("response" in auth) return auth.response; const input = productSchema.parse(await request.json()); const db = getDb(); const category = await db.category.findUnique({ where: { slug: input.categorySlug } }); if (!category) return jsonError("Category not found.", 404); const location = await db.location.findFirst({ where: { status: "ACTIVE" } }); if (!location) return jsonError("No active location is configured.", 409); const product = await db.product.create({ data: { categoryId: category.id, name: input.name, slug: input.slug, description: input.description, basePriceKobo: input.basePriceKobo, preparationMins: input.preparationMins, allergens: input.allergens, status: input.status, availability: { create: { locationId: location.id, isAvailable: input.status === "ACTIVE" } } } }); await db.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "product.create", entityType: "Product", entityId: product.id } }); return Response.json({ product }, { status: 201 }); }
  catch (error) { return handleApiError(error); }
}
