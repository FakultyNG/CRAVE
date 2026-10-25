import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { validateOwnershipChange } from "@/lib/profit/ownership";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const auth = await apiPermission("owners.manage"); if ("response" in auth) return auth.response; if (auth.session.user.role !== "Super Admin") return jsonError("Only the Super Admin can change ownership.", 403); const raw = z.object({ percentageBps: z.number().int().min(0).max(10_000), effectiveAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notes: z.string().trim().max(500).optional() }).parse(await request.json()); const input = { ...raw, effectiveAt: new Date(`${raw.effectiveAt}T00:00:00+01:00`) }; const { id: ownerId } = await params; const db = getDb(); const owner = await db.ownerProfile.findUnique({ where: { id: ownerId } }); if (!owner) return jsonError("Owner not found.", 404); await validateOwnershipChange({ ownerId, percentageBps: input.percentageBps, effectiveAt: input.effectiveAt }); const record = await db.$transaction(async (tx) => { const created = await tx.ownershipRecord.create({ data: { ownerId, ...input, createdById: auth.session.user.id } }); await tx.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "owner.ownership.change", entityType: "OwnershipRecord", entityId: created.id, metadata: { ownerId, ...input } } }); return created; }); return Response.json({ record }, { status: 201 }); } catch (error) { return handleApiError(error); }
}
