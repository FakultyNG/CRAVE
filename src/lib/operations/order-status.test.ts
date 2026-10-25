import { describe, expect, it } from "vitest";
import { canTransition } from "./order-status";

describe("order operations", () => {
  it("allows the kitchen workflow in order", () => { expect(canTransition("PAYMENT_CONFIRMED", "ACCEPTED", "DELIVERY")).toBe(true); expect(canTransition("ACCEPTED", "PREPARING", "DELIVERY")).toBe(true); });
  it("keeps pickup and delivery ready states separate", () => { expect(canTransition("PREPARING", "READY", "DELIVERY")).toBe(true); expect(canTransition("PREPARING", "READY", "PICKUP")).toBe(false); expect(canTransition("PREPARING", "READY_FOR_PICKUP", "PICKUP")).toBe(true); });
  it("rejects skipped states", () => expect(canTransition("PAYMENT_CONFIRMED", "DELIVERED", "DELIVERY")).toBe(false));
});
