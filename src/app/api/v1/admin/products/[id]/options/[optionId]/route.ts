import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { updateOptionSchema } from "@/lib/product-config/validation";
import { handleApiError, jsonError } from "@/lib/api";

type Context = { params: Promise<{ id: string; optionId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const auth = await apiPermission("products.update");
    if ("response" in auth) return auth.response;
    const input = updateOptionSchema.parse(await request.json());
    const { id: productId, optionId } = await params;
    const db = getDb();
    const current = await db.productOption.findFirst({ where: { id: optionId, productId } });
    if (!current) return jsonError("Option not found.", 404);
    if (input.name && await db.productOption.findFirst({ where: { productId, name: { equals: input.name, mode: "insensitive" }, id: { not: optionId } } })) return jsonError("That option name already exists for this product.", 409);
    const option = await db.$transaction(async (transaction) => {
      const groupName = input.groupName ?? current.groupName;
      if (input.isRequired !== undefined || input.maxSelections !== undefined) await transaction.productOption.updateMany({ where: { productId, groupName }, data: { isRequired: input.isRequired, maxSelections: input.maxSelections } });
      const updated = await transaction.productOption.update({ where: { id: optionId }, data: input });
      await transaction.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "product_option.update", entityType: "ProductOption", entityId: optionId, metadata: { productId, fields: Object.keys(input) } } });
      return updated;
    });
    return Response.json({ option });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const auth = await apiPermission("products.update");
    if ("response" in auth) return auth.response;
    const { id: productId, optionId } = await params;
    const db = getDb();
    const current = await db.productOption.findFirst({ where: { id: optionId, productId } });
    if (!current) return jsonError("Option not found.", 404);
    await db.$transaction([
      db.cartItemOption.deleteMany({ where: { optionId } }),
      db.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "product_option.delete", entityType: "ProductOption", entityId: optionId, metadata: { productId, name: current.name, groupName: current.groupName } } }),
      db.productOption.delete({ where: { id: optionId } }),
    ]);
    return Response.json({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
