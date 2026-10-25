import { describe, expect, it } from "vitest";
import { normalizeAppOrigin } from "@/lib/app-url";

describe("normalizeAppOrigin", () => {
  it("adds HTTPS to a Railway hostname", () => {
    expect(normalizeAppOrigin("crave-production.example.up.railway.app", "http://localhost:3000"))
      .toBe("https://crave-production.example.up.railway.app");
  });

  it("keeps a valid origin and removes paths", () => {
    expect(normalizeAppOrigin("https://crave.example.com/src/app", "http://localhost:3000"))
      .toBe("https://crave.example.com");
  });

  it("uses the fallback when no value is configured", () => {
    expect(normalizeAppOrigin(undefined, "http://127.0.0.1:3000"))
      .toBe("http://127.0.0.1:3000");
  });

  it("rejects non-HTTP protocols", () => {
    expect(() => normalizeAppOrigin("javascript:alert(1)", "http://localhost:3000"))
      .toThrow("NEXT_PUBLIC_APP_URL must use http:// or https://.");
  });
});
