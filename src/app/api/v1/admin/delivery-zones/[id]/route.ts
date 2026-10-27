import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { updateDeliveryZoneSchema } from "@/lib/delivery-zones/validation";
import { handleApiError, jsonError } from "@/lib/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await apiPermission("settings.manage");
    if ("response" in auth) return auth.response;
    const input = updateDeliveryZoneSchema.parse(await request.json());
    const { id } = await params;
    const db = getDb();
    const current = await db.deliveryZone.findUnique({ where: { id } });
    if (!current) return jsonError("Delivery area not found.", 404);
    if (input.locationId) {
      const location = await db.location.findUnique({ where: { id: input.locationId } });
      if (!location || location.status === "ARCHIVED") return jsonError("Choose an available business location.", 422);
    }
    if (input.slug) {
      const duplicate = await db.deliveryZone.findFirst({ where: { slug: input.slug, id: { not: id } } });
      if (duplicate) return jsonError("That delivery-area slug is already in use.", 409);
    }
    const zone = await db.$transaction(async (transaction) => {
      const updated = await transaction.deliveryZone.update({ where: { id }, data: input, include: { location: true, _count: { select: { orders: true } } } });
      await transaction.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "delivery_zone.update", entityType: "DeliveryZone", entityId: id, metadata: { fields: Object.keys(input) } } });
      return updated;
    });
    return Response.json({ zone });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await apiPermission("settings.manage");
    if ("response" in auth) return auth.response;
    const { id } = await params;
    const db = getDb();
    const zone = await db.deliveryZone.findUnique({ where: { id }, include: { _count: { select: { orders: true } } } });
    if (!zone) return jsonError("Delivery area not found.", 404);
    if (zone._count.orders > 0) {
      await db.$transaction([
        db.deliveryZone.update({ where: { id }, data: { isActive: false } }),
        db.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "delivery_zone.deactivate", entityType: "DeliveryZone", entityId: id, metadata: { reason: "order_history" } } }),
      ]);
      return Response.json({ archived: true });
    }
    await db.$transaction([
      db.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "delivery_zone.delete", entityType: "DeliveryZone", entityId: id, metadata: { name: zone.name } } }),
      db.deliveryZone.delete({ where: { id } }),
    ]);
    return Response.json({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
