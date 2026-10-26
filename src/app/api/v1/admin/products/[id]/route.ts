import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

const schema = z.object({ name: z.string().trim().min(2).max(100).optional(), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), categorySlug: z.string().trim().min(1).optional(), description: z.string().trim().min(10).max(1000).optional(), basePriceKobo: z.number().int().min(0).optional(), preparationMins: z.number().int().min(1).max(240).optional(), allergens: z.array(z.string().trim().min(1).max(40)).max(20).optional(), status: z.enum(["DRAFT", "ACTIVE", "UNAVAILABLE", "ARCHIVED"]).optional(), isFeatured: z.boolean().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const auth = await apiPermission("products.update"); if ("response" in auth) return auth.response; const input = schema.parse(await request.json()); const { id } = await params; const db = getDb(); const current = await db.product.findUnique({ where: { id } }); if (!current) return jsonError("Product not found.", 404); const { categorySlug, ...changes } = input; const category = categorySlug ? await db.category.findUnique({ where: { slug: categorySlug } }) : null; if (categorySlug && !category) return jsonError("Category not found.", 404); const product = await db.product.update({ where: { id }, data: { ...changes, categoryId: category?.id, archivedAt: input.status ? (input.status === "ARCHIVED" ? new Date() : null) : undefined, availability: input.status ? { updateMany: { where: {}, data: { isAvailable: input.status === "ACTIVE" } } } : undefined }, include: { category: true, media: { orderBy: { position: "asc" } } } }); await db.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "product.update", entityType: "Product", entityId: id, metadata: { fields: Object.keys(input) } } }); return Response.json({ product }); }
  catch (error) { return handleApiError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await apiPermission("products.delete");
    if ("response" in auth) return auth.response;
    const { id } = await params;
    const db = getDb();
    const product = await db.product.findUnique({ where: { id }, select: { id: true, name: true, orderItems: { select: { id: true }, take: 1 } } });
    if (!product) return jsonError("Product not found.", 404);
    if (product.orderItems.length > 0) {
      await db.$transaction([
        db.product.update({ where: { id }, data: { status: "ARCHIVED", archivedAt: new Date(), availability: { updateMany: { where: {}, data: { isAvailable: false } } } } }),
        db.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "product.archive", entityType: "Product", entityId: id, metadata: { reason: "order_history" } } }),
      ]);
      return Response.json({ archived: true });
    }
    await db.$transaction([
      db.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "product.delete", entityType: "Product", entityId: id, metadata: { name: product.name } } }),
      db.cartItem.deleteMany({ where: { productId: id } }),
      db.productCost.deleteMany({ where: { productId: id } }),
      db.product.delete({ where: { id } }),
    ]);
    return Response.json({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
