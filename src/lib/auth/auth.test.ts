import { describe, expect, it } from "vitest";
import { hashPin, verifyPin } from "./crypto";
import { loginSchema, normalizePhone, requestOtpSchema } from "./validation";

describe("phone authentication", () => {
  it("normalizes Nigerian local numbers", () => {
    expect(normalizePhone("0801 234 5678")).toBe("+2348012345678");
  });

  it("requires a preferred name for registration", () => {
    expect(requestOtpSchema.safeParse({ phone: "08012345678", channel: "SMS", purpose: "REGISTRATION" }).success).toBe(false);
  });

  it("accepts PIN recovery without a preferred name", () => {
    expect(requestOtpSchema.safeParse({ phone: "08012345678", channel: "WHATSAPP", purpose: "PIN_RESET" }).success).toBe(true);
  });

  it("requires a six-digit numeric PIN", () => {
    expect(loginSchema.safeParse({ phone: "08012345678", pin: "123456" }).success).toBe(true);
    expect(loginSchema.safeParse({ phone: "08012345678", pin: "1234" }).success).toBe(false);
  });

  it("hashes PINs with a unique salt", async () => {
    const first = await hashPin("123456");
    const second = await hashPin("123456");
    expect(first).not.toBe(second);
    expect(await verifyPin("123456", first)).toBe(true);
    expect(await verifyPin("654321", first)).toBe(false);
  });
});
