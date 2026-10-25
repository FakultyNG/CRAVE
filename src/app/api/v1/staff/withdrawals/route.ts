import { z } from "zod";
import { apiSession } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { staffWalletBalance, reconcileStaffSalary } from "@/lib/finance/staff-wallet";
import { encryptFinancialField } from "@/lib/finance/crypto";
import { enquireStrowalletAccount, getStrowalletBanks } from "@/lib/payouts/strowallet";
import { handleApiError, jsonError } from "@/lib/api";
import { ownerBalance } from "@/lib/finance/balance";
import { isLastCalendarDayInLagos } from "@/lib/finance/calendar";

const schema = z.object({ amountKobo: z.number().int().min(10000), bankCode: z.string().min(2).max(20), accountNumber: z.string().regex(/^\d{10}$/) });
export async function POST(request: Request) {
  try {
    const auth = await apiSession(); if ("response" in auth) return auth.response; if (auth.session.user.role === "Customer") return jsonError("Staff or owner access required.", 403); const input = schema.parse(await request.json()); const db = getDb();
    if (auth.session.user.role === "Owner") {
      const earlyAllowed = process.env.NODE_ENV !== "production" && process.env.ALLOW_EARLY_WITHDRAWALS === "true"; if (!isLastCalendarDayInLagos() && !earlyAllowed) return jsonError("Owner withdrawals can only be requested on the last calendar day of the month in Lagos.", 409);
      const owner = await db.ownerProfile.findUnique({ where: { userId: auth.session.user.id } }); if (!owner?.isActive) return jsonError("Owner wallet is not active.", 409);
      const existing = await db.withdrawalRequest.findFirst({ where: { ownerId: owner.id, status: { in: ["REQUESTED", "PENDING_APPROVAL", "APPROVED", "PROCESSING"] } } }); if (existing) return jsonError("You already have a withdrawal in progress.", 409);
      const balance = await ownerBalance(owner.id); if (input.amountKobo > balance.availableKobo) return jsonError("Withdrawal exceeds your approved available balance.", 409);
      const [account, banks] = await Promise.all([enquireStrowalletAccount(input.bankCode, input.accountNumber), getStrowalletBanks()]); const bank = banks.banks.find((item) => item.code === input.bankCode); if (!bank) return jsonError("Bank is not available for transfers.", 422);
      const withdrawal = await db.withdrawalRequest.create({ data: { ownerId: owner.id, status: "PENDING_APPROVAL", amountKobo: input.amountKobo, bankCode: input.bankCode, bankName: bank.name, accountNumberEncrypted: encryptFinancialField(input.accountNumber), accountNumberLast4: input.accountNumber.slice(-4), accountName: account.accountName, nameEnquiryReference: account.reference, events: { create: { type: "REQUESTED", payload: { bankCode: input.bankCode, accountLast4: input.accountNumber.slice(-4), accountName: account.accountName } } } } });
      return Response.json({ withdrawal: { id: withdrawal.id, status: withdrawal.status, kind: "OWNER" } }, { status: 201 });
    }
    const staff = await db.staffProfile.findUnique({ where: { userId: auth.session.user.id } }); if (!staff || staff.status !== "ACTIVE") return jsonError("Active staff access required.", 403);
    await reconcileStaffSalary(staff.id);
    const existing = await db.staffWithdrawalRequest.findFirst({ where: { staffId: staff.id, status: { in: ["REQUESTED", "PENDING_APPROVAL", "APPROVED", "PROCESSING"] } } }); if (existing) return jsonError("You already have a withdrawal in progress.", 409);
    const balance = await staffWalletBalance(staff.id); if (input.amountKobo > balance.availableKobo) return jsonError("Withdrawal exceeds your available earned balance.", 409);
    const [account, banks] = await Promise.all([enquireStrowalletAccount(input.bankCode, input.accountNumber), getStrowalletBanks()]); const bank = banks.banks.find((item) => item.code === input.bankCode); if (!bank) return jsonError("Bank is not available for transfers.", 422);
    const withdrawal = await db.staffWithdrawalRequest.create({ data: { staffId: staff.id, status: "PENDING_APPROVAL", amountKobo: input.amountKobo, bankCode: input.bankCode, bankName: bank.name, accountNumberEncrypted: encryptFinancialField(input.accountNumber), accountNumberLast4: input.accountNumber.slice(-4), accountName: account.accountName, nameEnquiryReference: account.reference, events: { create: { type: "REQUESTED", payload: { bankCode: input.bankCode, accountLast4: input.accountNumber.slice(-4), accountName: account.accountName } } } } });
    return Response.json({ withdrawal: { id: withdrawal.id, status: withdrawal.status } }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
