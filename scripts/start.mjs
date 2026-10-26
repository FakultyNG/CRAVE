// Railway and other container platforms require the server to accept traffic on
// every interface. The generated standalone server otherwise trusts HOSTNAME,
// which container runtimes may set to an internal container identifier.
process.env.HOSTNAME = "0.0.0.0";

await import("../.next/standalone/server.js");
