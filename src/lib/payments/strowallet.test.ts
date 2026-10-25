import { describe, expect, it } from "vitest";
import { normalizePaymentStatus } from "./strowallet";

describe("Strowallet status normalization", () => {
  it.each(["success", "successful", "PAID", "completed"])("treats %s as paid", (status) => expect(normalizePaymentStatus(status)).toBe("paid"));
  it("keeps unfamiliar states pending", () => expect(normalizePaymentStatus("processing")).toBe("pending"));
  it("recognizes terminal failures", () => { expect(normalizePaymentStatus("declined")).toBe("failed"); expect(normalizePaymentStatus("abandoned")).toBe("cancelled"); });
});
