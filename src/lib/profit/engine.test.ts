import { describe, expect, it } from "vitest";
import { allocateByLargestRemainder } from "./engine";

describe("profit allocation", () => {
  it("uses deterministic largest-remainder rounding", () => {
    const result = allocateByLargestRemainder(10, [{ ownerId: "b", weightPpm: 500_000 }, { ownerId: "a", weightPpm: 500_000 }]);
    expect(result.allocations.find((item) => item.ownerId === "a")?.amountKobo).toBe(5);
    expect(result.allocations.reduce((sum, item) => sum + item.amountKobo, 0)).toBe(10);
  });

  it("leaves unallocated ownership undistributed", () => {
    const result = allocateByLargestRemainder(1_000, [{ ownerId: "a", weightPpm: 650_000 }]);
    expect(result.allocatedProfitKobo).toBe(650);
    expect(result.unallocatedProfitKobo).toBe(350);
  });
});
