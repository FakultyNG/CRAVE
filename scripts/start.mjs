import { spawnSync } from "node:child_process";

// Railway and other container platforms require the server to accept traffic on
// every interface. The generated standalone server otherwise trusts HOSTNAME,
// which container runtimes may set to an internal container identifier.
process.env.HOSTNAME = "0.0.0.0";

function runPackageScript(script) {
  const packageManagerPath = process.env.npm_execpath;
  const command = packageManagerPath ? process.execPath : process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const args = packageManagerPath ? [packageManagerPath, "run", script] : ["run", script];
  const result = spawnSync(command, args, { env: process.env, stdio: "inherit", timeout: 60_000 });

  if (result.error || result.status !== 0) {
    console.error(`Database preparation step '${script}' failed. Starting the web server so diagnostics remain available.`, result.error ?? `Exit code ${result.status}`);
    return false;
  }
  return true;
}

if (process.env.DATABASE_URL) {
  console.log("Preparing the database before starting Crave...");
  const migrationReady = runPackageScript("db:deploy");
  let schemaReady = runPackageScript("db:push:deploy");
  let emptyDatabase = false;
  if (!schemaReady) {
    emptyDatabase = runPackageScript("db:assert-empty");
  }
  if (!schemaReady && emptyDatabase) {
    schemaReady = runPackageScript("db:push:empty");
  }
  if (!schemaReady && !emptyDatabase && runPackageScript("db:assert-incomplete")) {
    console.warn("Resetting the incomplete database with explicit owner approval.");
    schemaReady = runPackageScript("db:reset-incomplete");
  }
  process.env.DATABASE_PREPARATION = `migration:${migrationReady ? "ok" : "failed"},schema:${schemaReady ? "ok" : "failed"},empty:${emptyDatabase ? "yes" : "no"}`;
  if (schemaReady && runPackageScript("db:seed:if-empty")) {
    runPackageScript("db:bootstrap-admin:if-configured");
  }
} else {
  console.warn("DATABASE_URL is not configured; database-backed features will be unavailable.");
}

await import("../.next/standalone/server.js");
