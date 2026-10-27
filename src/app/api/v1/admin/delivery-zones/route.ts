import { connection } from "next/server";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { createDeliveryZoneSchema } from "@/lib/delivery-zones/validation";
import { handleApiError, jsonError } from "@/lib/api";

export async function GET() {
  await connection();
  try {
    const auth = await apiPermission("settings.manage");
    if ("response" in auth) return auth.response;
    const db = getDb();
    const [zones, locations] = await Promise.all([
      db.deliveryZone.findMany({
        include: { location: true, _count: { select: { orders: true } } },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
      db.location.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" } }),
    ]);
    return Response.json({ zones, locations });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await apiPermission("settings.manage");
    if ("response" in auth) return auth.response;
    const input = createDeliveryZoneSchema.parse(await request.json());
    const db = getDb();
    const [location, duplicate] = await Promise.all([
      db.location.findUnique({ where: { id: input.locationId } }),
      db.deliveryZone.findUnique({ where: { slug: input.slug } }),
    ]);
    if (!location || location.status === "ARCHIVED") return jsonError("Choose an available business location.", 422);
    if (duplicate) return jsonError("That delivery-area slug is already in use.", 409);
    const zone = await db.$transaction(async (transaction) => {
      const created = await transaction.deliveryZone.create({ data: input, include: { location: true, _count: { select: { orders: true } } } });
      await transaction.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "delivery_zone.create", entityType: "DeliveryZone", entityId: created.id, metadata: { name: created.name, feeKobo: created.feeKobo } } });
      return created;
    });
    return Response.json({ zone }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
