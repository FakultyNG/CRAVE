import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const auth = await apiPermission("owners.manage"); if ("response" in auth) return auth.response; if (auth.session.user.role !== "Super Admin") return jsonError("Only the Super Admin can assign owner privileges.", 403); const { permissionKeys } = z.object({ permissionKeys: z.array(z.string()) }).parse(await request.json()); const { id } = await params; const db = getDb(); const owner = await db.ownerProfile.findUnique({ where: { id } }); if (!owner) return jsonError("Owner not found.", 404); await db.$transaction(async (tx) => { const permissions = await tx.permission.findMany({ where: { key: { in: permissionKeys } } }); await tx.userPermission.deleteMany({ where: { userId: owner.userId } }); if (permissions.length) await tx.userPermission.createMany({ data: permissions.map((permission) => ({ userId: owner.userId, permissionId: permission.id, granted: true })) }); await tx.session.updateMany({ where: { userId: owner.userId }, data: { revokedAt: new Date() } }); await tx.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "owner.permissions.change", entityType: "OwnerProfile", entityId: owner.id, metadata: { permissionKeys } } }); }); return Response.json({ ok: true }); } catch (error) { return handleApiError(error); }
}
