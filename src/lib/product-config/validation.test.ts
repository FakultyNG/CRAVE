import { describe, expect, it } from "vitest";
import { createOptionSchema, createVariantSchema, updateOptionSchema } from "./validation";

describe("product configuration validation", () => {
  it("accepts a size with a price adjustment", () => {
    expect(createVariantSchema.parse({ name: "Large", priceDeltaKobo: 150000 }).isActive).toBe(true);
  });

  it("accepts a required blend group", () => {
    const option = createOptionSchema.parse({ name: "Mango", groupName: "Choose a blend", isRequired: true, maxSelections: 1 });
    expect(option.groupName).toBe("Choose a blend");
  });

  it("rejects empty edits and invalid selection limits", () => {
    expect(() => updateOptionSchema.parse({})).toThrow();
    expect(() => createOptionSchema.parse({ name: "Mango", groupName: "Blend", maxSelections: 0 })).toThrow();
  });
});
