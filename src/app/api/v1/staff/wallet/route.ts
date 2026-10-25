import { connection } from "next/server";
import { apiStaff } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { reconcileStaffSalary, staffWalletBalance } from "@/lib/finance/staff-wallet";

export async function GET() {
  await connection();
  try {
    const auth = await apiStaff(); if ("response" in auth) return auth.response;
    const db = getDb();
    const staff = await db.staffProfile.findUnique({ where: { userId: auth.session.user.id }, include: { role: true } });
    if (!staff) return jsonError("Staff wallet not found.", 404);
    await reconcileStaffSalary(staff.id);
    const fresh = await db.staffProfile.findUniqueOrThrow({ where: { id: staff.id } });
    const [balance, transactions, withdrawals] = await Promise.all([
      staffWalletBalance(staff.id),
      db.staffWalletEntry.findMany({ where: { staffId: staff.id }, orderBy: { createdAt: "desc" }, take: 100 }),
      db.staffWithdrawalRequest.findMany({ where: { staffId: staff.id }, orderBy: { requestedAt: "desc" }, select: { id: true, status: true, amountKobo: true, bankName: true, accountNumberLast4: true, accountName: true, requestedAt: true, failureReason: true } }),
    ]);
    return Response.json({ balance, salary: { amountKobo: fresh.salaryKobo, nextDueAt: fresh.nextSalaryAt, state: "NOT_YET_EARNED" }, role: staff.role.name, transactions, withdrawals });
  } catch (error) { return handleApiError(error); }
}
