import { describe, expect, it } from "vitest";
import { createDeliveryZoneSchema, updateDeliveryZoneSchema } from "./validation";

describe("delivery area validation", () => {
  it("accepts a complete delivery area", () => {
    expect(createDeliveryZoneSchema.parse({
      name: "Ajah",
      slug: "ajah",
      locationId: "location-1",
      feeKobo: 250000,
      minimumOrderKobo: 500000,
      estimatedMinutes: 60,
    }).isActive).toBe(true);
  });

  it("rejects invalid slugs and negative charges", () => {
    expect(() => createDeliveryZoneSchema.parse({
      name: "Ajah",
      slug: "Ajah Area",
      locationId: "location-1",
      feeKobo: -1,
      minimumOrderKobo: 0,
      estimatedMinutes: 60,
    })).toThrow();
  });

  it("requires at least one edit", () => {
    expect(() => updateDeliveryZoneSchema.parse({})).toThrow();
  });
});
