import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

export const accountDefinitions = [
  ["1000", "PAYMENT_CLEARING", "Payment provider clearing", "ASSET"],
  ["1010", "BANK", "Bank and settled cash", "ASSET"],
  ["1200", "INVENTORY", "Inventory and production cost reserve", "ASSET"],
  ["1300", "PREFUNDED_PAYROLL", "Prefunded payroll capital", "ASSET"],
  ["2000", "ACCOUNTS_PAYABLE", "Accounts payable", "LIABILITY"],
  ["2100", "PROMOTIONAL_CREDIT", "Crave Credit liability", "LIABILITY"],
  ["2200", "PAYROLL_PAYABLE", "Payroll payable", "LIABILITY"],
  ["2300", "OWNER_DISTRIBUTIONS_PAYABLE", "Approved owner distributions payable", "LIABILITY"],
  ["3000", "OWNER_CAPITAL", "Owner contributed capital", "EQUITY"],
  ["3100", "OWNER_DISTRIBUTIONS", "Owner profit distributions", "EQUITY"],
  ["4000", "SALES_REVENUE", "Food and beverage sales", "REVENUE"],
  ["4010", "DELIVERY_REVENUE", "Delivery revenue", "REVENUE"],
  ["4090", "SALES_DISCOUNTS", "Coupons and sales discounts", "CONTRA_REVENUE"],
  ["4095", "SALES_RETURNS", "Returns and refunds", "CONTRA_REVENUE"],
  ["5000", "COGS", "Cost of goods sold", "EXPENSE"],
  ["6000", "EXP_INGREDIENTS", "Ingredients expense", "EXPENSE"],
  ["6010", "EXP_PACKAGING", "Packaging expense", "EXPENSE"],
  ["6020", "EXP_SALARIES", "Salaries expense", "EXPENSE"],
  ["6030", "EXP_RENT", "Rent expense", "EXPENSE"],
  ["6040", "EXP_ELECTRICITY", "Electricity expense", "EXPENSE"],
  ["6050", "EXP_COOKING_GAS", "Cooking gas expense", "EXPENSE"],
  ["6060", "EXP_WATER", "Water expense", "EXPENSE"],
  ["6070", "EXP_MARKETING", "Marketing expense", "EXPENSE"],
  ["6080", "EXP_DELIVERY_SUBSIDIES", "Delivery subsidies", "EXPENSE"],
  ["6090", "EXP_REPAIRS", "Repairs and maintenance", "EXPENSE"],
  ["6100", "EXP_MISC", "Miscellaneous operating expense", "EXPENSE"],
  ["7000", "PROCESSING_FEES", "Payment processing fees", "EXPENSE"],
  ["7100", "TAXES_OTHER", "Taxes and other charges", "EXPENSE"],
] as const;

export const expenseCategoryDefinitions = [
  ["ingredients", "Ingredients", "EXP_INGREDIENTS", true],
  ["packaging", "Packaging", "EXP_PACKAGING", false],
  ["salaries", "Salaries", "EXP_SALARIES", false],
  ["rent", "Rent", "EXP_RENT", false],
  ["electricity", "Electricity", "EXP_ELECTRICITY", false],
  ["cooking-gas", "Cooking gas", "EXP_COOKING_GAS", false],
  ["water", "Water", "EXP_WATER", false],
  ["marketing", "Marketing", "EXP_MARKETING", false],
  ["delivery-subsidies", "Delivery subsidies", "EXP_DELIVERY_SUBSIDIES", false],
  ["repairs", "Repairs", "EXP_REPAIRS", false],
  ["miscellaneous", "Miscellaneous operating costs", "EXP_MISC", false],
] as const;

export function lagosMonthKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit" }).formatToParts(date);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

export function periodBounds(monthKey: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) throw new Error("Invalid accounting month.");
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return {
    startsAt: new Date(Date.UTC(year, monthIndex, 1, -1)),
    endsAt: new Date(Date.UTC(year, monthIndex + 1, 1, -1) - 1),
  };
}

export async function ensureAccountingSetup() {
  const db = getDb();
  for (const [code, systemKey, name, type] of accountDefinitions) {
    await db.accountingAccount.upsert({
      where: { systemKey },
      update: { code, name, type },
      create: { code, systemKey, name, type },
    });
  }
  const accounts = await db.accountingAccount.findMany({ select: { id: true, systemKey: true } });
  const accountByKey = new Map(accounts.map((account) => [account.systemKey, account.id]));
  for (const [systemKey, name, accountKey, inventoryPurchase] of expenseCategoryDefinitions) {
    const defaultAccountId = accountByKey.get(accountKey);
    if (!defaultAccountId) throw new Error(`Missing account ${accountKey}.`);
    await db.expenseCategory.upsert({
      where: { systemKey },
      update: { name, defaultAccountId, inventoryPurchase },
      create: { systemKey, name, defaultAccountId, inventoryPurchase },
    });
  }
  return accountByKey;
}

type PostingLine = {
  accountKey: string;
  debitKobo?: number;
  creditKobo?: number;
  locationId?: string | null;
  orderId?: string;
  expenseId?: string;
  description?: string;
};

export async function postJournal(input: {
  sourceType: string;
  sourceId: string;
  entryDate: Date;
  description: string;
  createdById?: string;
  lines: PostingLine[];
}) {
  const debitKobo = input.lines.reduce((sum, line) => sum + (line.debitKobo ?? 0), 0);
  const creditKobo = input.lines.reduce((sum, line) => sum + (line.creditKobo ?? 0), 0);
  if (debitKobo <= 0 || debitKobo !== creditKobo) throw new Error("Journal entry is not balanced.");
  for (const line of input.lines) {
    const debit = line.debitKobo ?? 0;
    const credit = line.creditKobo ?? 0;
    if (debit < 0 || credit < 0 || (debit === 0) === (credit === 0)) throw new Error("Each journal line must contain one positive debit or credit.");
  }

  const accountByKey = await ensureAccountingSetup();
  const db = getDb();
  const existing = await db.journalEntry.findUnique({ where: { sourceType_sourceId: { sourceType: input.sourceType, sourceId: input.sourceId } }, include: { lines: true } });
  if (existing) return existing;
  const monthKey = lagosMonthKey(input.entryDate);
  const bounds = periodBounds(monthKey);

  return db.$transaction(async (tx) => {
    const period = await tx.financialPeriod.upsert({ where: { monthKey }, update: {}, create: { monthKey, ...bounds } });
    if (period.status === "CLOSED") throw new Error(`Accounting period ${monthKey} is closed. Post a dated adjustment in an open period.`);
    return tx.journalEntry.create({
      data: {
        entryNumber: `JE-${monthKey.replace("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`,
        periodId: period.id,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        entryDate: input.entryDate,
        description: input.description,
        createdById: input.createdById,
        lines: {
          create: input.lines.map((line) => {
            const accountId = accountByKey.get(line.accountKey);
            if (!accountId) throw new Error(`Unknown account ${line.accountKey}.`);
            return { accountId, debitKobo: line.debitKobo ?? 0, creditKobo: line.creditKobo ?? 0, locationId: line.locationId, orderId: line.orderId, expenseId: line.expenseId, description: line.description };
          }),
        },
      },
      include: { lines: true },
    });
  });
}

export async function postPaidOrder(orderId: string) {
  const db = getDb();
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order?.paidAt) return null;
  const cogsKobo = order.items.reduce((sum, item) => sum + item.productionCostKobo * item.quantity, 0);
  const lines: PostingLine[] = [];
  if (order.totalKobo > 0) lines.push({ accountKey: "PAYMENT_CLEARING", debitKobo: order.totalKobo, locationId: order.locationId, orderId });
  if (order.promotionalCreditKobo > 0) lines.push({ accountKey: "PROMOTIONAL_CREDIT", debitKobo: order.promotionalCreditKobo, locationId: order.locationId, orderId });
  if (order.couponDiscountKobo > 0) lines.push({ accountKey: "SALES_DISCOUNTS", debitKobo: order.couponDiscountKobo, locationId: order.locationId, orderId });
  if (order.subtotalKobo > 0) lines.push({ accountKey: "SALES_REVENUE", creditKobo: order.subtotalKobo, locationId: order.locationId, orderId });
  if (order.deliveryFeeKobo > 0) lines.push({ accountKey: "DELIVERY_REVENUE", creditKobo: order.deliveryFeeKobo, locationId: order.locationId, orderId });
  if (cogsKobo > 0) {
    lines.push({ accountKey: "COGS", debitKobo: cogsKobo, locationId: order.locationId, orderId });
    lines.push({ accountKey: "INVENTORY", creditKobo: cogsKobo, locationId: order.locationId, orderId });
  }
  return postJournal({ sourceType: "ORDER_REVENUE", sourceId: orderId, entryDate: order.paidAt, description: `Revenue and estimated cost for order ${order.orderNumber}`, lines });
}

export async function postApprovedExpense(expenseId: string) {
  const expense = await getDb().expense.findUnique({ where: { id: expenseId }, include: { category: { include: { defaultAccount: true } } } });
  if (!expense || !["APPROVED", "POSTED"].includes(expense.approvalStatus)) return null;
  const debitAccountKey = expense.category.inventoryPurchase ? "INVENTORY" : expense.category.defaultAccount.systemKey;
  const creditAccountKey = expense.paymentStatus === "PAID" ? "BANK" : "ACCOUNTS_PAYABLE";
  const entry = await postJournal({
    sourceType: "EXPENSE",
    sourceId: expense.id,
    entryDate: expense.expenseDate,
    description: expense.description,
    createdById: expense.approvedById ?? expense.createdById,
    lines: [
      { accountKey: debitAccountKey, debitKobo: expense.amountKobo, locationId: expense.locationId, expenseId },
      { accountKey: creditAccountKey, creditKobo: expense.amountKobo, locationId: expense.locationId, expenseId },
    ],
  });
  await getDb().expense.updateMany({ where: { id: expense.id, approvalStatus: "APPROVED" }, data: { approvalStatus: "POSTED" } });
  return entry;
}

export async function reverseJournal(entryId: string, actorUserId: string, reason: string, reversalDate = new Date()) {
  const db = getDb();
  const original = await db.journalEntry.findUnique({ where: { id: entryId }, include: { lines: { include: { account: true } }, reversal: true } });
  if (!original) throw new Error("Journal entry not found.");
  if (original.reversal) return original.reversal;
  const reversal = await postJournal({
    sourceType: "JOURNAL_REVERSAL",
    sourceId: original.id,
    entryDate: reversalDate,
    description: `Reversal of ${original.entryNumber}: ${reason}`,
    createdById: actorUserId,
    lines: original.lines.map((line) => ({ accountKey: line.account.systemKey, debitKobo: line.creditKobo, creditKobo: line.debitKobo, locationId: line.locationId, orderId: line.orderId ?? undefined, expenseId: line.expenseId ?? undefined })),
  });
  await db.$transaction([
    db.journalEntry.update({ where: { id: original.id }, data: { status: "REVERSED" } }),
    db.journalEntry.update({ where: { id: reversal.id }, data: { reversalOfId: original.id } }),
    db.auditLog.create({ data: { actorUserId, action: "accounting.journal.reverse", entityType: "JournalEntry", entityId: original.id, metadata: { reason, reversalId: reversal.id } } }),
  ]);
  return reversal;
}

export async function syncOperationalAccounting() {
  await ensureAccountingSetup();
  const db = getDb();
  const [orders, expenses, grossSalaries, creditEntries] = await Promise.all([
    db.order.findMany({ where: { paidAt: { not: null }, journalLines: { none: {} } }, select: { id: true }, take: 250, orderBy: { paidAt: "asc" } }),
    db.expense.findMany({ where: { approvalStatus: { in: ["APPROVED", "POSTED"] }, journalLines: { none: {} } }, select: { id: true }, take: 250, orderBy: { expenseDate: "asc" } }),
    db.grossRevenueLedgerEntry.findMany({ where: { sourceType: "STAFF_SALARY" }, take: 250, orderBy: { createdAt: "asc" } }),
    db.promotionalCreditEntry.findMany({ where: { type: { in: ["CREDIT", "EXPIRED", "REVERSAL"] } }, take: 250, orderBy: { createdAt: "asc" } }),
  ]);
  for (const order of orders) await postPaidOrder(order.id);
  for (const expense of expenses) await postApprovedExpense(expense.id);
  const existingSalaryEntries = grossSalaries.length ? await db.journalEntry.findMany({ where: { sourceType: "GROSS_FUNDED_SALARY", sourceId: { in: grossSalaries.map((entry) => entry.sourceId) } }, select: { sourceId: true } }) : [];
  const postedSalaryIds = new Set(existingSalaryEntries.map((entry) => entry.sourceId));
  for (const salary of grossSalaries.filter((entry) => !postedSalaryIds.has(entry.sourceId))) {
    await postJournal({ sourceType: "GROSS_FUNDED_SALARY", sourceId: salary.sourceId, entryDate: salary.createdAt, description: salary.description, lines: [{ accountKey: "EXP_SALARIES", debitKobo: salary.amountKobo }, { accountKey: "PAYROLL_PAYABLE", creditKobo: salary.amountKobo }] });
  }
  const creditSourceIds = creditEntries.map((entry) => entry.id);
  const existingCreditEntries = creditSourceIds.length ? await db.journalEntry.findMany({ where: { sourceType: "PROMOTIONAL_CREDIT", sourceId: { in: creditSourceIds } }, select: { sourceId: true } }) : [];
  const postedCreditIds = new Set(existingCreditEntries.map((entry) => entry.sourceId));
  for (const credit of creditEntries.filter((entry) => !postedCreditIds.has(entry.id))) {
    const issued = credit.type === "CREDIT";
    await postJournal({ sourceType: "PROMOTIONAL_CREDIT", sourceId: credit.id, entryDate: credit.createdAt, description: credit.description, lines: issued ? [{ accountKey: "EXP_MARKETING", debitKobo: credit.amountKobo }, { accountKey: "PROMOTIONAL_CREDIT", creditKobo: credit.amountKobo }] : [{ accountKey: "PROMOTIONAL_CREDIT", debitKobo: credit.amountKobo }, { accountKey: "EXP_MARKETING", creditKobo: credit.amountKobo }] });
  }
  return { ordersPosted: orders.length, expensesPosted: expenses.length, salariesPosted: grossSalaries.length - postedSalaryIds.size, creditsPosted: creditEntries.length - postedCreditIds.size };
}

export type AccountingTransaction = Prisma.TransactionClient;
