import "server-only";

import { getDb } from "@/lib/db";
import { syncOperationalAccounting } from "./core";

export type FinancialTotals = {
  grossSalesKobo: number;
  deliveryRevenueKobo: number;
  discountsKobo: number;
  returnsKobo: number;
  netSalesKobo: number;
  cogsKobo: number;
  grossProfitKobo: number;
  operatingExpensesKobo: number;
  otherChargesKobo: number;
  operatingProfitKobo: number;
  netProfitKobo: number;
};

export function calculateProfit(input: Omit<FinancialTotals, "netSalesKobo" | "grossProfitKobo" | "operatingProfitKobo" | "netProfitKobo">): FinancialTotals {
  const netSalesKobo = input.grossSalesKobo + input.deliveryRevenueKobo - input.discountsKobo - input.returnsKobo;
  const grossProfitKobo = netSalesKobo - input.cogsKobo;
  const operatingProfitKobo = grossProfitKobo - input.operatingExpensesKobo;
  const netProfitKobo = operatingProfitKobo - input.otherChargesKobo;
  return { ...input, netSalesKobo, grossProfitKobo, operatingProfitKobo, netProfitKobo };
}

export async function financialReport(from: Date, to: Date, locationId?: string) {
  await syncOperationalAccounting();
  const db = getDb();
  const where = { journalEntry: { entryDate: { gte: from, lte: to } }, ...(locationId ? { locationId } : {}) };
  const lines = await db.journalLine.findMany({ where, include: { account: true } });
  const netDebits = (keys: string[]) => lines.filter((line) => keys.includes(line.account.systemKey)).reduce((sum, line) => sum + line.debitKobo - line.creditKobo, 0);
  const netCredits = (keys: string[]) => lines.filter((line) => keys.includes(line.account.systemKey)).reduce((sum, line) => sum + line.creditKobo - line.debitKobo, 0);
  const operatingExpenseKeys = lines.filter((line) => line.account.systemKey.startsWith("EXP_")).map((line) => line.account.systemKey);
  const totals = calculateProfit({
    grossSalesKobo: netCredits(["SALES_REVENUE"]),
    deliveryRevenueKobo: netCredits(["DELIVERY_REVENUE"]),
    discountsKobo: netDebits(["SALES_DISCOUNTS"]),
    returnsKobo: netDebits(["SALES_RETURNS"]),
    cogsKobo: netDebits(["COGS"]),
    operatingExpensesKobo: netDebits([...new Set(operatingExpenseKeys)]),
    otherChargesKobo: netDebits(["PROCESSING_FEES", "TAXES_OTHER"]),
  });

  const orderWhere = { createdAt: { gte: from, lte: to }, ...(locationId ? { locationId } : {}) };
  const [ordersCreated, paidOrders, unpaidOrders, refunds, settlements, paymentSummary, salaryFunding, productRows, categoryRows, locationRows] = await Promise.all([
    db.order.count({ where: orderWhere }),
    db.order.count({ where: { paidAt: { gte: from, lte: to }, ...(locationId ? { locationId } : {}) } }),
    db.order.count({ where: { ...orderWhere, paidAt: null } }),
    db.refund.findMany({ where: { requestedAt: { gte: from, lte: to }, ...(locationId ? { order: { locationId } } : {}) }, include: { order: true }, orderBy: { requestedAt: "desc" } }),
    db.paymentSettlement.findMany({ where: { createdAt: { gte: from, lte: to }, ...(locationId ? { locationId } : {}) }, orderBy: { createdAt: "desc" } }),
    db.paymentIntent.groupBy({ by: ["provider", "status"], where: { createdAt: { gte: from, lte: to }, ...(locationId ? { order: { locationId } } : {}) }, _count: { id: true }, _sum: { amountKobo: true } }),
    db.staffWalletEntry.groupBy({ by: ["fundingSource"], where: { type: "SALARY", createdAt: { gte: from, lte: to }, fundingSource: { not: null } }, _sum: { amountKobo: true } }),
    db.orderItem.groupBy({ by: ["productId", "productName"], where: { order: { paidAt: { gte: from, lte: to }, ...(locationId ? { locationId } : {}) } }, _sum: { lineTotalKobo: true, quantity: true }, orderBy: { _sum: { lineTotalKobo: "desc" } } }),
    db.orderItem.groupBy({ by: ["productId"], where: { order: { paidAt: { gte: from, lte: to }, ...(locationId ? { locationId } : {}) } }, _sum: { lineTotalKobo: true } }),
    db.order.groupBy({ by: ["locationId"], where: { paidAt: { gte: from, lte: to }, ...(locationId ? { locationId } : {}) }, _sum: { subtotalKobo: true, totalKobo: true }, _count: { id: true } }),
  ]);
  const products = await db.product.findMany({ where: { id: { in: categoryRows.map((row) => row.productId) } }, include: { category: true } });
  const categoryMap = new Map<string, number>();
  for (const row of categoryRows) {
    const category = products.find((product) => product.id === row.productId)?.category.name ?? "Uncategorised";
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + (row._sum.lineTotalKobo ?? 0));
  }
  const locations = await db.location.findMany({ where: { id: { in: locationRows.map((row) => row.locationId) } } });
  const periods = await db.financialPeriod.findMany({ where: { startsAt: { lte: to }, endsAt: { gte: from } }, orderBy: { startsAt: "desc" } });

  return {
    range: { from, to }, totals,
    orderActivity: { created: ordersCreated, paid: paidOrders, unpaid: unpaidOrders },
    byProduct: productRows.map((row) => ({ name: row.productName, quantity: row._sum.quantity ?? 0, revenueKobo: row._sum.lineTotalKobo ?? 0 })),
    byCategory: [...categoryMap].map(([name, revenueKobo]) => ({ name, revenueKobo })).sort((a, b) => b.revenueKobo - a.revenueKobo),
    byLocation: locationRows.map((row) => ({ name: locations.find((location) => location.id === row.locationId)?.name ?? "Unknown", orders: row._count.id, grossSalesKobo: row._sum.subtotalKobo ?? 0, cashCollectedKobo: row._sum.totalKobo ?? 0 })),
    refunds,
    settlements,
    paymentSummary: paymentSummary.map((item) => ({ provider: item.provider, status: item.status, count: item._count.id, amountKobo: item._sum.amountKobo ?? 0 })),
    salaryFunding: { prefundedCapitalKobo: salaryFunding.find((item) => item.fundingSource === "PREFUNDED_CAPITAL")?._sum.amountKobo ?? 0, grossRevenueKobo: salaryFunding.find((item) => item.fundingSource === "GROSS_REVENUE")?._sum.amountKobo ?? 0 },
    periods,
    accountingBasis: periods.some((period) => period.status === "CLOSED") ? "Includes finalised closed periods and estimated open periods" : "Estimated - accounting periods are not yet closed",
  };
}
