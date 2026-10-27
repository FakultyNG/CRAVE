import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { createOptionSchema } from "@/lib/product-config/validation";
import { handleApiError, jsonError } from "@/lib/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await apiPermission("products.update");
    if ("response" in auth) return auth.response;
    const input = createOptionSchema.parse(await request.json());
    const { id: productId } = await params;
    const db = getDb();
    const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return jsonError("Product not found.", 404);
    if (await db.productOption.findFirst({ where: { productId, name: { equals: input.name, mode: "insensitive" } } })) return jsonError("That option name already exists for this product.", 409);
    const option = await db.$transaction(async (transaction) => {
      await transaction.productOption.updateMany({ where: { productId, groupName: input.groupName }, data: { isRequired: input.isRequired, maxSelections: input.maxSelections } });
      const created = await transaction.productOption.create({ data: { ...input, productId } });
      await transaction.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "product_option.create", entityType: "ProductOption", entityId: created.id, metadata: { productId, name: created.name, groupName: created.groupName } } });
      return created;
    });
    return Response.json({ option }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
