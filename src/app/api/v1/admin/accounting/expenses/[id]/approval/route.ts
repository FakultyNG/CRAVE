import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { postApprovedExpense } from "@/lib/accounting/core";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await apiPermission("accounting.manage"); if ("response" in auth) return auth.response;
    const { approved, note } = z.object({ approved: z.boolean(), note: z.string().trim().max(300).optional() }).parse(await request.json());
    const { id } = await params; const db = getDb();
    const expense = await db.expense.findUnique({ where: { id } });
    if (!expense) return jsonError("Expense not found.", 404);
    if (expense.createdById === auth.session.user.id) return jsonError("A different authorised staff member must approve this expense.", 403);
    if (expense.approvalStatus !== "PENDING_APPROVAL") return jsonError("This expense is no longer awaiting approval.", 409);
    await db.$transaction([
      db.expense.update({ where: { id }, data: approved ? { approvalStatus: "APPROVED", approvedById: auth.session.user.id, approvedAt: new Date() } : { approvalStatus: "REJECTED", approvedById: auth.session.user.id, approvedAt: new Date(), rejectionReason: note ?? "Rejected by finance." } }),
      db.auditLog.create({ data: { actorUserId: auth.session.user.id, action: approved ? "accounting.expense.approve" : "accounting.expense.reject", entityType: "Expense", entityId: id, metadata: { note } } }),
    ]);
    if (approved) await postApprovedExpense(id);
    return Response.json({ ok: true });
  } catch (error) { return handleApiError(error); }
}
