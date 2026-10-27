import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { updateVariantSchema } from "@/lib/product-config/validation";
import { handleApiError, jsonError } from "@/lib/api";

type Context = { params: Promise<{ id: string; variantId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const auth = await apiPermission("products.update");
    if ("response" in auth) return auth.response;
    const input = updateVariantSchema.parse(await request.json());
    const { id: productId, variantId } = await params;
    const db = getDb();
    const current = await db.productVariant.findFirst({ where: { id: variantId, productId } });
    if (!current) return jsonError("Variant not found.", 404);
    if (input.name && await db.productVariant.findFirst({ where: { productId, name: { equals: input.name, mode: "insensitive" }, id: { not: variantId } } })) return jsonError("That size or variant already exists for this product.", 409);
    if (input.sku && await db.productVariant.findFirst({ where: { sku: input.sku, id: { not: variantId } } })) return jsonError("That SKU is already in use.", 409);
    const variant = await db.$transaction(async (transaction) => {
      const updated = await transaction.productVariant.update({ where: { id: variantId }, data: input });
      await transaction.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "product_variant.update", entityType: "ProductVariant", entityId: variantId, metadata: { productId, fields: Object.keys(input) } } });
      return updated;
    });
    return Response.json({ variant });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const auth = await apiPermission("products.update");
    if ("response" in auth) return auth.response;
    const { id: productId, variantId } = await params;
    const db = getDb();
    const current = await db.productVariant.findFirst({ where: { id: variantId, productId } });
    if (!current) return jsonError("Variant not found.", 404);
    await db.$transaction([
      db.cartItem.updateMany({ where: { variantId }, data: { variantId: null } }),
      db.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "product_variant.delete", entityType: "ProductVariant", entityId: variantId, metadata: { productId, name: current.name } } }),
      db.productVariant.delete({ where: { id: variantId } }),
    ]);
    return Response.json({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
