import { z } from "zod";
import { apiOwner } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { ownerBalance } from "@/lib/finance/balance";
import { isLastCalendarDayInLagos } from "@/lib/finance/calendar";
import { encryptFinancialField } from "@/lib/finance/crypto";
import { enquireStrowalletAccount, getStrowalletBanks } from "@/lib/payouts/strowallet";
import { handleApiError, jsonError } from "@/lib/api";

const schema = z.object({ amountKobo: z.number().int().min(10000), bankCode: z.string().min(2).max(20), accountNumber: z.string().regex(/^\d{10}$/) });
export async function POST(request: Request) {
  try {
    const auth = await apiOwner(); if ("response" in auth) return auth.response; const input = schema.parse(await request.json());
    const earlyAllowed = process.env.NODE_ENV !== "production" && process.env.ALLOW_EARLY_WITHDRAWALS === "true"; if (!isLastCalendarDayInLagos() && !earlyAllowed) return jsonError("Withdrawals can only be requested on the last calendar day of the month in Lagos.", 409);
    const db = getDb(); const owner = await db.ownerProfile.findUnique({ where: { userId: auth.session.user.id }, include: { user: true } }); if (!owner?.isActive) return jsonError("Owner wallet is not active.", 409); if (!owner.user.phoneVerifiedAt) return jsonError("Verify your identity before requesting a withdrawal.", 409); const existing = await db.withdrawalRequest.findFirst({ where: { ownerId: owner.id, status: { in: ["REQUESTED", "PENDING_APPROVAL", "APPROVED", "PROCESSING"] } } }); if (existing) return jsonError("You already have a withdrawal in progress.", 409); const balance = await ownerBalance(owner.id); if (input.amountKobo > balance.availableKobo) return jsonError("Withdrawal exceeds your approved available balance.", 409);
    const [account, banks] = await Promise.all([enquireStrowalletAccount(input.bankCode, input.accountNumber), getStrowalletBanks()]); const bank = banks.banks.find((item) => item.code === input.bankCode); if (!bank) return jsonError("Bank is not available for transfers.", 422);
    const encrypted = encryptFinancialField(input.accountNumber); const withdrawal = await db.$transaction(async (tx) => { await tx.ownerProfile.update({ where: { id: owner.id }, data: { bankCode: input.bankCode, bankName: bank.name, accountNumberEncrypted: encrypted, accountNumberLast4: input.accountNumber.slice(-4), accountName: account.accountName, nameEnquiryReference: account.reference } }); const created = await tx.withdrawalRequest.create({ data: { ownerId: owner.id, status: "PENDING_APPROVAL", amountKobo: input.amountKobo, bankCode: input.bankCode, bankName: bank.name, accountNumberEncrypted: encrypted, accountNumberLast4: input.accountNumber.slice(-4), accountName: account.accountName, nameEnquiryReference: account.reference, events: { create: { type: "REQUESTED", payload: { bankCode: input.bankCode, accountLast4: input.accountNumber.slice(-4), accountName: account.accountName } } } } }); await tx.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "owner.withdrawal.request", entityType: "WithdrawalRequest", entityId: created.id, metadata: { amountKobo: input.amountKobo, bankCode: input.bankCode } } }); return created; });
    return Response.json({ withdrawal: { id: withdrawal.id, status: withdrawal.status, amountKobo: withdrawal.amountKobo, bankName: withdrawal.bankName, accountName: withdrawal.accountName } }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
