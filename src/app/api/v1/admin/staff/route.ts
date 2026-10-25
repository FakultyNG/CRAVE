import { connection } from "next/server";
import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { randomToken, hashToken } from "@/lib/auth/crypto";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { normalizePhone } from "@/lib/auth/validation";
import { firstSalaryDueAt } from "@/lib/finance/calendar";
import { salaryFundingSource } from "@/lib/finance/payroll-settings";

const inviteSchema = z.object({ phone: z.string().trim().min(7).max(25), roleId: z.string().min(1), locationId: z.string().optional(), salaryKobo: z.number().int().positive() });

export async function GET() {
  await connection();
  try { const auth = await apiPermission("staff.manage"); if ("response" in auth) return auth.response; const db = getDb(); const [staff, roles, locations, invitations, fundingSource] = await Promise.all([db.staffProfile.findMany({ include: { user: { select: { id: true, preferredName: true, phone: true, status: true } }, role: true, location: true }, orderBy: { createdAt: "desc" } }), db.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { name: "asc" } }), db.location.findMany({ where: { status: "ACTIVE" } }), db.invitation.findMany({ where: { acceptedAt: null, expiresAt: { gt: new Date() } }, include: { role: true, location: true }, orderBy: { createdAt: "desc" } }), salaryFundingSource()]); return Response.json({ staff, roles, locations, invitations, fundingSource, canFund: auth.session.user.role === "Super Admin" }); }
  catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try { const auth = await apiPermission("staff.manage"); if ("response" in auth) return auth.response; const input = inviteSchema.parse(await request.json()); const phone = normalizePhone(input.phone); const db = getDb(); const role = await db.role.findUnique({ where: { id: input.roleId } }); if (!role || role.name === "Owner") return jsonError("Choose an operational staff role.", 422); const existing = await db.user.findUnique({ where: { phone }, include: { staffProfile: true } }); if (existing?.staffProfile) return jsonError("That person is already a staff member.", 409); if (existing) { await db.staffProfile.create({ data: { userId: existing.id, roleId: role.id, locationId: input.locationId, salaryKobo: input.salaryKobo, nextSalaryAt: firstSalaryDueAt(), status: "ACTIVE" } }); return Response.json({ activated: true }); } const invitation = await db.invitation.create({ data: { phone, roleId: role.id, locationId: input.locationId, salaryKobo: input.salaryKobo, tokenHash: hashToken(randomToken()), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }); await db.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "staff.invite", entityType: "Invitation", entityId: invitation.id, metadata: { phone, role: role.name, salaryKobo: input.salaryKobo } } }); return Response.json({ invitation: { id: invitation.id, phone: invitation.phone, expiresAt: invitation.expiresAt }, message: "Ask the staff member to register with this phone number. Their role and salary activate after OTP verification." }, { status: 201 }); }
  catch (error) { return handleApiError(error); }
}
