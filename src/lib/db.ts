import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { cravePrisma?: PrismaClient };

export function getDb() {
  if (globalForPrisma.cravePrisma) return globalForPrisma.cravePrisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for database-backed features.");
  }

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  if (process.env.NODE_ENV !== "production") globalForPrisma.cravePrisma = client;
  return client;
}
