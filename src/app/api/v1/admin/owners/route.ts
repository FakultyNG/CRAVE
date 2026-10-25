import { connection } from "next/server";
import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { normalizePhone } from "@/lib/auth/validation";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { ownershipAt, totalOwnershipAt, validateOwnershipChange } from "@/lib/profit/ownership";

const createSchema = z.object({ preferredName: z.string().trim().min(2).max(100), email: z.string().email().optional().or(z.literal("")), phone: z.string().trim().min(7).max(25), percentageBps: z.number().int().min(0).max(10_000), effectiveAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), notes: z.string().trim().max(500).optional(), permissionKeys: z.array(z.string()).default([]) });

export async function GET() {
  await connection();
  try {
    const auth = await apiPermission("owners.read"); if ("response" in auth) return auth.response;
    const db = getDb(); const [owners, records, permissions] = await Promise.all([db.ownerProfile.findMany({ include: { user: { include: { userPermissions: { where: { granted: true }, include: { permission: true } } } }, ownershipRecords: { orderBy: { effectiveAt: "desc" }, include: { createdBy: { select: { preferredName: true } } } }, _count: { select: { withdrawals: true } } }, orderBy: { createdAt: "desc" } }), db.ownershipRecord.findMany({ orderBy: { effectiveAt: "asc" } }), db.permission.findMany({ orderBy: { key: "asc" } })]);
    const current = ownershipAt(records, new Date());
    return Response.json({ owners: owners.map((owner) => ({ ...owner, invitationStatus: owner.user.pinHash ? "ACCEPTED" : "INVITED", currentPercentageBps: current.find((item) => item.ownerId === owner.id)?.percentageBps ?? 0 })), permissions, allocatedBps: totalOwnershipAt(records, new Date()), unallocatedBps: Math.max(0, 10_000 - totalOwnershipAt(records, new Date())), canManage: auth.session.user.role === "Super Admin" && auth.session.user.permissions.includes("owners.manage") });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const auth = await apiPermission("owners.manage"); if ("response" in auth) return auth.response; if (auth.session.user.role !== "Super Admin") return jsonError("Only the Super Admin can create owners.", 403);
    const raw = createSchema.parse(await request.json()); const input = { ...raw, effectiveAt: new Date(`${raw.effectiveAt}T00:00:00+01:00`) }; const phone = normalizePhone(input.phone); const db = getDb(); const existing = await db.user.findUnique({ where: { phone }, include: { ownerProfile: true } });
    if (existing?.ownerProfile) return jsonError("That person is already an owner.", 409);
    const ownerId = existing?.id ?? "pending";
    if (existing) await validateOwnershipChange({ ownerId: existing.id, percentageBps: input.percentageBps, effectiveAt: input.effectiveAt });
    const owner = await db.$transaction(async (tx) => {
      const user = existing ? await tx.user.update({ where: { id: existing.id }, data: { preferredName: input.preferredName, email: input.email || null } }) : await tx.user.create({ data: { preferredName: input.preferredName, email: input.email || null, phone } });
      if (!existing) await validateOwnershipChange({ ownerId: user.id, percentageBps: input.percentageBps, effectiveAt: input.effectiveAt });
      const profile = await tx.ownerProfile.create({ data: { userId: user.id, notes: input.notes, ownershipRecords: { create: { percentageBps: input.percentageBps, effectiveAt: input.effectiveAt, notes: input.notes, createdById: auth.session.user.id } } } });
      const validPermissions = await tx.permission.findMany({ where: { key: { in: input.permissionKeys } } });
      if (validPermissions.length) await tx.userPermission.createMany({ data: validPermissions.map((permission) => ({ userId: user.id, permissionId: permission.id, granted: true })), skipDuplicates: true });
      await tx.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "owner.create", entityType: "OwnerProfile", entityId: profile.id, metadata: { phone, percentageBps: input.percentageBps, effectiveAt: input.effectiveAt, ownerId } } });
      return profile;
    });
    return Response.json({ owner, message: existing?.pinHash ? "Owner access is active on the existing account." : "The owner can register with this phone number to accept access." }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
