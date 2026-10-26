import { spawnSync } from "node:child_process";

// Railway and other container platforms require the server to accept traffic on
// every interface. The generated standalone server otherwise trusts HOSTNAME,
// which container runtimes may set to an internal container identifier.
process.env.HOSTNAME = "0.0.0.0";

function runPackageScript(script) {
  const packageManagerPath = process.env.npm_execpath;
  const command = packageManagerPath ? process.execPath : process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const args = packageManagerPath ? [packageManagerPath, "run", script] : ["run", script];
  const result = spawnSync(command, args, { env: process.env, stdio: "inherit" });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.DATABASE_URL) {
  console.log("Preparing the database before starting Crave...");
  runPackageScript("db:deploy");
  runPackageScript("db:seed:if-empty");
  runPackageScript("db:bootstrap-admin:if-configured");
} else {
  console.warn("DATABASE_URL is not configured; database-backed features will be unavailable.");
}

await import("../.next/standalone/server.js");
