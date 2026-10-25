import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

const schema = z.object({ name: z.string().trim().min(2).max(100).optional(), description: z.string().trim().min(10).max(1000).optional(), basePriceKobo: z.number().int().min(0).optional(), preparationMins: z.number().int().min(1).max(240).optional(), allergens: z.array(z.string().max(40)).max(20).optional(), status: z.enum(["DRAFT", "ACTIVE", "UNAVAILABLE", "ARCHIVED"]).optional(), isFeatured: z.boolean().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const auth = await apiPermission("products.update"); if ("response" in auth) return auth.response; const input = schema.parse(await request.json()); const { id } = await params; const db = getDb(); const current = await db.product.findUnique({ where: { id } }); if (!current) return jsonError("Product not found.", 404); const product = await db.product.update({ where: { id }, data: { ...input, archivedAt: input.status === "ARCHIVED" ? new Date() : undefined, availability: input.status ? { updateMany: { where: {}, data: { isAvailable: input.status === "ACTIVE" } } } : undefined } }); await db.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "product.update", entityType: "Product", entityId: id, metadata: { fields: Object.keys(input) } } }); return Response.json({ product }); }
  catch (error) { return handleApiError(error); }
}
