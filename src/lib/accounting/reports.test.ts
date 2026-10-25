import { describe, expect, it } from "vitest";
import { calculateProfit } from "./reports";

describe("calculateProfit", () => {
  it("keeps cash, discounts, cost and operating charges distinct", () => {
    expect(calculateProfit({ grossSalesKobo: 1_000_000, deliveryRevenueKobo: 50_000, discountsKobo: 100_000, returnsKobo: 25_000, cogsKobo: 300_000, operatingExpensesKobo: 200_000, otherChargesKobo: 25_000 })).toMatchObject({ netSalesKobo: 925_000, grossProfitKobo: 625_000, operatingProfitKobo: 425_000, netProfitKobo: 400_000 });
  });
});
