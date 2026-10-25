import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const auth = await apiPermission("customers.manage"); if ("response" in auth) return auth.response; const { status } = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }).parse(await request.json()); const { id } = await params; if (id === auth.session.user.id) return jsonError("You cannot change your own status.", 409); const db = getDb(); const result = await db.user.updateMany({ where: { id, staffProfile: null }, data: { status } }); if (!result.count) return jsonError("Customer not found.", 404); if (status === "SUSPENDED") await db.session.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } }); await db.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "customer.status.update", entityType: "User", entityId: id, metadata: { status } } }); return Response.json({ updated: true }); }
  catch (error) { return handleApiError(error); }
}
