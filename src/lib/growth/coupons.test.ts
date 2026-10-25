import { describe, expect, it } from "vitest";
import { calculateCouponDiscount } from "./coupon-calculations";

describe("coupon calculations", () => {
  it("calculates basis-point percentages and applies caps", () => expect(calculateCouponDiscount({ discountType: "PERCENTAGE", value: 1000, eligibleSubtotalKobo: 1000000, maximumDiscountKobo: 75000 })).toBe(75000));
  it("never discounts more than the eligible products", () => expect(calculateCouponDiscount({ discountType: "FIXED_AMOUNT", value: 50000, eligibleSubtotalKobo: 30000 })).toBe(30000));
});
