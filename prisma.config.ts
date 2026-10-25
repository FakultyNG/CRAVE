import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Allows client generation during CI/builds before runtime secrets are injected.
    url: process.env.DATABASE_URL ?? "postgresql://crave:crave@localhost:5432/crave",
  },
});
