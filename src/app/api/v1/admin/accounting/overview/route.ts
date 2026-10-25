import { connection } from "next/server";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api";
import { financialReport } from "@/lib/accounting/reports";
import { reportRange } from "@/lib/accounting/query";

export async function GET(request: Request) {
  await connection();
  try {
    const auth = await apiPermission("accounting.read");
    if ("response" in auth) return auth.response;
    const range = reportRange(request.url);
    const db = getDb();
    const [report, expenses, categories, locations, suppliers, journals, accounts, audit] = await Promise.all([
      financialReport(range.from, range.to, range.locationId),
      db.expense.findMany({ where: { expenseDate: { gte: range.from, lte: range.to }, ...(range.locationId ? { locationId: range.locationId } : {}) }, include: { category: true, location: true, supplier: true, createdBy: { select: { preferredName: true } }, approvedBy: { select: { preferredName: true } } }, orderBy: { expenseDate: "desc" }, take: 100 }),
      db.expenseCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      db.location.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
      db.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      db.journalEntry.findMany({ where: { entryDate: { gte: range.from, lte: range.to } }, include: { period: true, lines: { include: { account: true } } }, orderBy: { entryDate: "desc" }, take: 100 }),
      db.accountingAccount.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
      db.auditLog.findMany({ where: { action: { startsWith: "accounting." }, createdAt: { gte: range.from, lte: range.to } }, include: { actor: { select: { preferredName: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    return Response.json({ report, expenses, categories, locations, suppliers, journals, accounts, audit, canManage: auth.session.user.permissions.includes("accounting.manage") });
  } catch (error) { return handleApiError(error); }
}
