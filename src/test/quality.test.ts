import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("production quality controls", () => {
  it("ships keyboard and reduced-motion accessibility affordances", () => {
    const layout = source("src/app/layout.tsx");
    const css = source("src/app/globals.css");

    expect(layout).toContain("Skip to main content");
    expect(layout).toContain('id="page-content"');
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("forced-colors: active");
  });

  it("configures baseline browser security headers", () => {
    const config = source("next.config.ts");

    for (const header of [
      "Content-Security-Policy",
      "Permissions-Policy",
      "Referrer-Policy",
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-Frame-Options",
    ]) expect(config).toContain(header);
  });

  it("keeps deployment and database rollout reproducible", () => {
    const railway = JSON.parse(source("railway.json")) as { deploy: { preDeployCommand: string[]; healthcheckPath: string } };
    const migration = source("prisma/migrations/20261025000000_initial/migration.sql");

    expect(railway.deploy.preDeployCommand).toContain("pnpm db:deploy");
    expect(railway.deploy.healthcheckPath).toBe("/api/health");
    expect(migration).toContain('CREATE TABLE "User"');
  });
});
