import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiSession } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

const schema = z.object({ amountKobo: z.number().int().positive(), memo: z.string().trim().min(3).max(300) });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await apiSession(); if ("response" in auth) return auth.response;
    if (auth.session.user.role !== "Super Admin") return jsonError("Only the Super Admin can fund staff wallets.", 403);
    const input = schema.parse(await request.json()); const { id } = await params; const db = getDb();
    const staff = await db.staffProfile.findUnique({ where: { id } }); if (!staff) return jsonError("Staff member not found.", 404);
    const sourceId = randomUUID();
    const entry = await db.$transaction(async (tx) => {
      const created = await tx.staffWalletEntry.create({ data: { staffId: id, type: "BONUS", amountKobo: input.amountKobo, description: "Super Admin wallet funding", memo: input.memo, sourceType: "ADMIN_FUNDING", sourceId } });
      await tx.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "staff.wallet.fund", entityType: "StaffProfile", entityId: id, metadata: { amountKobo: input.amountKobo, memo: input.memo, ledgerEntryId: created.id } } });
      return created;
    });
    return Response.json({ entry }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
