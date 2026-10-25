import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

const schema = z.object({ roleId: z.string().optional(), status: z.enum(["ACTIVE", "SUSPENDED"]).optional(), locationId: z.string().nullable().optional(), salaryKobo: z.number().int().positive().optional() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const auth = await apiPermission("staff.manage"); if ("response" in auth) return auth.response; const input = schema.parse(await request.json()); const { id } = await params; const db = getDb(); const staff = await db.staffProfile.findUnique({ where: { id }, include: { role: true } }); if (!staff) return jsonError("Staff member not found.", 404); if (staff.userId === auth.session.user.id) return jsonError("You cannot change your own role or status.", 409); if (input.roleId) { const role = await db.role.findUnique({ where: { id: input.roleId } }); if (!role || role.name === "Owner") return jsonError("Invalid operational role.", 422); } const updated = await db.staffProfile.update({ where: { id }, data: input }); if (input.status === "SUSPENDED") await db.session.updateMany({ where: { userId: staff.userId }, data: { revokedAt: new Date() } }); await db.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "staff.update", entityType: "StaffProfile", entityId: id, metadata: input } }); return Response.json({ staff: updated }); }
  catch (error) { return handleApiError(error); }
}
