import { describe, expect, it } from "vitest";
import { optionSelectionError } from "./selections";

const options = [
  { name: "Mango", groupName: "Blend", isRequired: true, maxSelections: 1 },
  { name: "Berry", groupName: "Blend", isRequired: true, maxSelections: 1 },
  { name: "Honey", groupName: "Extras", isRequired: false, maxSelections: 2 },
  { name: "Granola", groupName: "Extras", isRequired: false, maxSelections: 2 },
  { name: "Fruit", groupName: "Extras", isRequired: false, maxSelections: 2 },
];

describe("product option selection rules", () => {
  it("requires a selection from required groups", () => {
    expect(optionSelectionError(options, [])).toBe("Choose an option for Blend.");
  });

  it("enforces each group's maximum", () => {
    expect(optionSelectionError(options, ["Mango", "Honey", "Granola", "Fruit"])).toBe("Choose no more than 2 for Extras.");
  });

  it("accepts valid grouped selections", () => {
    expect(optionSelectionError(options, ["Berry", "Honey", "Fruit"])).toBeNull();
  });
});
