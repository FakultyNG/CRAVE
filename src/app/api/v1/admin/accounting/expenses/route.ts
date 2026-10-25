import { connection } from "next/server";
import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { lagosMonthKey, periodBounds } from "@/lib/accounting/core";

const expenseSchema = z.object({
  categoryId: z.string().min(1), amountKobo: z.number().int().positive(), expenseDate: z.coerce.date(), description: z.string().trim().min(3).max(300),
  locationId: z.string().optional().nullable(), supplierId: z.string().optional().nullable(), receiptUrl: z.string().url().optional().or(z.literal("")),
  paymentStatus: z.enum(["UNPAID", "PAID"]).default("UNPAID"), isRecurring: z.boolean().default(false), recurrence: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).optional().nullable(), nextOccurrenceAt: z.coerce.date().optional().nullable(),
});

export async function GET() {
  await connection();
  try { const auth = await apiPermission("accounting.read"); if ("response" in auth) return auth.response; return Response.json({ expenses: await getDb().expense.findMany({ include: { category: true, location: true, supplier: true, createdBy: { select: { preferredName: true } }, approvedBy: { select: { preferredName: true } } }, orderBy: { expenseDate: "desc" }, take: 250 }) }); } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const auth = await apiPermission("accounting.manage"); if ("response" in auth) return auth.response;
    const input = expenseSchema.parse(await request.json());
    if (input.isRecurring && !input.recurrence) return jsonError("Choose a recurrence schedule.", 422);
    const db = getDb();
    const bounds = periodBounds(lagosMonthKey(input.expenseDate));
    const closed = await db.financialPeriod.findFirst({ where: { status: "CLOSED", startsAt: { lte: bounds.endsAt }, endsAt: { gte: bounds.startsAt } } });
    if (closed) return jsonError("That accounting period is closed. Record an adjustment in an open period.", 409);
    const expense = await db.$transaction(async (tx) => {
      const created = await tx.expense.create({ data: { ...input, receiptUrl: input.receiptUrl || null, createdById: auth.session.user.id, approvalStatus: "PENDING_APPROVAL" } });
      await tx.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "accounting.expense.create", entityType: "Expense", entityId: created.id, metadata: { amountKobo: created.amountKobo, categoryId: created.categoryId } } });
      return created;
    });
    return Response.json({ expense }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
