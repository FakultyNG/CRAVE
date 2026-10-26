import { describe, expect, it } from "vitest";
import { destinationForRole } from "./destination";

describe("role-aware authentication destinations", () => {
  it("sends customers to their account", () => {
    expect(destinationForRole("Customer")).toBe("/account");
  });

  it("sends owners to the owner workspace", () => {
    expect(destinationForRole("Owner")).toBe("/owner");
  });

  it("sends staff roles to the admin workspace", () => {
    expect(destinationForRole("Super Admin")).toBe("/admin");
    expect(destinationForRole("Kitchen Staff")).toBe("/admin");
  });
});
