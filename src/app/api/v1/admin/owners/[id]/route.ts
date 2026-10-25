import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const auth = await apiPermission("owners.manage"); if ("response" in auth) return auth.response; if (auth.session.user.role !== "Super Admin") return jsonError("Only the Super Admin can update owners.", 403); const input = z.object({ preferredName: z.string().trim().min(2).max(100).optional(), email: z.string().email().nullable().optional(), notes: z.string().trim().max(500).nullable().optional(), isActive: z.boolean().optional() }).parse(await request.json()); const { id } = await params; const db = getDb(); const owner = await db.ownerProfile.findUnique({ where: { id } }); if (!owner) return jsonError("Owner not found.", 404); const updated = await db.$transaction(async (tx) => { const item = await tx.ownerProfile.update({ where: { id }, data: { notes: input.notes, isActive: input.isActive }, include: { user: true } }); if (input.preferredName !== undefined || input.email !== undefined) await tx.user.update({ where: { id: owner.userId }, data: { preferredName: input.preferredName, email: input.email } }); await tx.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "owner.update", entityType: "OwnerProfile", entityId: id, metadata: input } }); return item; }); return Response.json({ owner: updated }); } catch (error) { return handleApiError(error); }
}
