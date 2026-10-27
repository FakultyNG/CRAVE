import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { createVariantSchema } from "@/lib/product-config/validation";
import { handleApiError, jsonError } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await apiPermission("products.update");
    if ("response" in auth) return auth.response;
    const input = createVariantSchema.parse(await request.json());
    const { id: productId } = await params;
    const db = getDb();
    const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return jsonError("Product not found.", 404);
    const duplicate = await db.productVariant.findFirst({ where: { productId, name: { equals: input.name, mode: "insensitive" } } });
    if (duplicate) return jsonError("That size or variant already exists for this product.", 409);
    if (input.sku && await db.productVariant.findUnique({ where: { sku: input.sku } })) return jsonError("That SKU is already in use.", 409);
    const variant = await db.$transaction(async (transaction) => {
      const created = await transaction.productVariant.create({ data: { ...input, productId } });
      await transaction.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "product_variant.create", entityType: "ProductVariant", entityId: created.id, metadata: { productId, name: created.name } } });
      return created;
    });
    return Response.json({ variant }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
