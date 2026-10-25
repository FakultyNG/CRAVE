import "server-only";

import type { SalaryFundingSource } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

export const SALARY_FUNDING_KEY = "salaryFundingSource";
export async function salaryFundingSource(): Promise<SalaryFundingSource> {
  const setting = await getDb().setting.findUnique({ where: { key: SALARY_FUNDING_KEY } });
  return setting?.value === "GROSS_REVENUE" ? "GROSS_REVENUE" : "PREFUNDED_CAPITAL";
}
