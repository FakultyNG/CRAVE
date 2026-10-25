import { describe, expect, it } from "vitest";
import { cartTotals, lineTotalKobo } from "./pricing";

describe("server-authoritative pricing", () => {
  it("includes the variant and every selected option", () => {
    expect(lineTotalKobo({ quantity: 2, basePriceKobo: 300000, variantDeltaKobo: 50000, optionDeltasKobo: [30000, 20000] })).toBe(800000);
  });

  it("adds delivery after the subtotal", () => {
    expect(cartTotals([{ quantity: 1, basePriceKobo: 400000 }], 180000)).toEqual({ subtotalKobo: 400000, deliveryFeeKobo: 180000, totalKobo: 580000 });
  });
});
