import { connection } from "next/server";
import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { financialReport } from "@/lib/accounting/reports";

export async function GET() { await connection(); try { const auth = await apiPermission("accounting.read"); if ("response" in auth) return auth.response; return Response.json({ periods: await getDb().financialPeriod.findMany({ orderBy: { startsAt: "desc" }, include: { submittedBy: { select: { preferredName: true } }, approvedBy: { select: { preferredName: true } }, closedBy: { select: { preferredName: true } } } }) }); } catch (error) { return handleApiError(error); } }

export async function PATCH(request: Request) {
  try {
    const auth = await apiPermission("accounting.manage"); if ("response" in auth) return auth.response;
    const input = z.object({ periodId: z.string(), status: z.enum(["REVIEW", "APPROVED", "CLOSED"]), notes: z.string().trim().max(500).optional() }).parse(await request.json());
    const db = getDb(); const period = await db.financialPeriod.findUnique({ where: { id: input.periodId } });
    if (!period) return jsonError("Accounting period not found.", 404);
    const nextByStatus = { DRAFT: "REVIEW", REVIEW: "APPROVED", APPROVED: "CLOSED", CLOSED: null } as const;
    if (nextByStatus[period.status] !== input.status) return jsonError(`The next valid state is ${nextByStatus[period.status] ?? "none"}.`, 409);
    const unbalanced = await db.journalEntry.findMany({ where: { periodId: period.id }, include: { lines: true } });
    if (unbalanced.some((entry) => entry.lines.reduce((sum, line) => sum + line.debitKobo - line.creditKobo, 0) !== 0)) return jsonError("The period contains an unbalanced journal entry.", 409);
    if (input.status === "CLOSED") {
      const pendingExpenses = await db.expense.count({ where: { expenseDate: { gte: period.startsAt, lte: period.endsAt }, approvalStatus: "PENDING_APPROVAL" } });
      if (pendingExpenses) return jsonError(`${pendingExpenses} expense(s) still await approval.`, 409);
    }
    const snapshot = input.status === "CLOSED" ? await financialReport(period.startsAt, period.endsAt) : null;
    const now = new Date();
    const data = input.status === "REVIEW" ? { status: input.status, notes: input.notes, submittedAt: now, submittedById: auth.session.user.id } : input.status === "APPROVED" ? { status: input.status, notes: input.notes, approvedAt: now, approvedById: auth.session.user.id } : { status: input.status, notes: input.notes, closedAt: now, closedById: auth.session.user.id, reportSnapshot: snapshot as never };
    const updated = await db.$transaction(async (tx) => { const item = await tx.financialPeriod.update({ where: { id: period.id }, data }); await tx.auditLog.create({ data: { actorUserId: auth.session.user.id, action: `accounting.period.${input.status.toLowerCase()}`, entityType: "FinancialPeriod", entityId: period.id, metadata: { monthKey: period.monthKey, notes: input.notes } } }); return item; });
    return Response.json({ period: updated });
  } catch (error) { return handleApiError(error); }
}
