import { spawnSync } from "node:child_process";

// Railway and other container platforms require the server to accept traffic on
// every interface. The generated standalone server otherwise trusts HOSTNAME,
// which container runtimes may set to an internal container identifier.
process.env.HOSTNAME = "0.0.0.0";
const preparationFailures = new Map();

function failureCategory(result) {
  if (result.error?.code === "ETIMEDOUT") return "timeout";
  if (result.error) return "process-error";
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const postgresCode = output.match(/PostgreSQL code\s+([A-Z0-9]+)/i)?.[1];
  if (postgresCode) return `postgres-${postgresCode}`;
  if (/contains data/i.test(output)) return "existing-data";
  if (/command not found|not recognized|MODULE_NOT_FOUND|ENOENT/i.test(output)) return "tool-unavailable";
  if (/data loss|accept-data-loss/i.test(output)) return "data-loss-warning";
  return `exit-${result.status ?? "unknown"}`;
}

function runPackageScript(script) {
  const packageManagerPath = process.env.npm_execpath;
  const command = packageManagerPath ? process.execPath : process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const args = packageManagerPath ? [packageManagerPath, "run", script] : ["run", script];
  const result = spawnSync(command, args, { env: process.env, encoding: "utf8", stdio: ["inherit", "pipe", "pipe"], timeout: 60_000 });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error || result.status !== 0) {
    preparationFailures.set(script, failureCategory(result));
    console.error(`Database preparation step '${script}' failed. Starting the web server so diagnostics remain available.`, result.error ?? `Exit code ${result.status}`);
    return false;
  }
  preparationFailures.delete(script);
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
  if (!schemaReady && !emptyDatabase) {
    console.warn("Resetting the incomplete database with explicit owner approval.");
    schemaReady = runPackageScript("db:reset-incomplete");
  }
  process.env.DATABASE_PREPARATION = `migration:${migrationReady ? "ok" : "failed"},schema:${schemaReady ? "ok" : "failed"},empty:${emptyDatabase ? "yes" : "no"}`;
  process.env.DATABASE_PREPARATION_FAILURES = [...preparationFailures].map(([step, reason]) => `${step}:${reason}`).join(",") || "none";
  if (schemaReady && runPackageScript("db:seed:if-empty")) {
    runPackageScript("db:bootstrap-admin:if-configured");
  }
} else {
  console.warn("DATABASE_URL is not configured; database-backed features will be unavailable.");
}

await import("../.next/standalone/server.js");
