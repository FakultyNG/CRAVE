import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const request = new Request("http://localhost/.well-known/pki-validation/");

afterEach(() => {
  delete process.env.PKI_VALIDATION_FILENAME;
  delete process.env.PKI_VALIDATION_CONTENT_BASE64;
});

describe("PKI validation route", () => {
  it("reports that the validation endpoint is reachable", async () => {
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("PKI validation endpoint ready.\n");
  });

  it("serves only the configured validation file", async () => {
    process.env.PKI_VALIDATION_FILENAME = "validation.txt";
    process.env.PKI_VALIDATION_CONTENT_BASE64 = Buffer.from("certificate-authority-token\n").toString("base64");

    const valid = await GET(request, { params: Promise.resolve({ file: ["validation.txt"] }) });
    const unknown = await GET(request, { params: Promise.resolve({ file: ["other.txt"] }) });

    expect(valid.status).toBe(200);
    await expect(valid.text()).resolves.toBe("certificate-authority-token\n");
    expect(unknown.status).toBe(404);
  });
});
