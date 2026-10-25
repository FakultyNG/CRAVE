import "server-only";
import { getDb } from "@/lib/db";
import { verifyTransfer } from "@/lib/payouts";
import { postJournal } from "@/lib/accounting/core";

export async function verifyAndApplyWithdrawal(reference: string) {
  const db = getDb(); const withdrawal = await db.withdrawalRequest.findUnique({ where: { merchantReference: reference } }); if (!withdrawal) return null;
  const wasPaid = withdrawal.status === "PAID";
  const result = await verifyTransfer(reference);
  const updated = await db.$transaction(async (tx) => {
    const current = await tx.withdrawalRequest.findUniqueOrThrow({ where: { id: withdrawal.id } });
    await tx.withdrawalEvent.create({ data: { withdrawalId: current.id, type: "PROVIDER_VERIFICATION", payload: result.raw as never } });
    if (result.status === "PAID" && current.status !== "PAID") {
      await tx.ownerLedgerEntry.upsert({ where: { sourceType_sourceId_type: { sourceType: "WITHDRAWAL", sourceId: current.id, type: "DEBIT" } }, update: {}, create: { ownerId: current.ownerId, type: "DEBIT", amountKobo: current.amountKobo, description: `Owner withdrawal ${reference}`, sourceType: "WITHDRAWAL", sourceId: current.id } });
      return tx.withdrawalRequest.update({ where: { id: current.id }, data: { status: "PAID", paidAt: new Date(), providerSessionId: result.sessionId, providerResponse: result.raw as never } });
    }
    if (result.status === "REFUNDED") {
      if (current.status === "PAID") await tx.ownerLedgerEntry.upsert({ where: { sourceType_sourceId_type: { sourceType: "WITHDRAWAL_REFUND", sourceId: current.id, type: "CREDIT" } }, update: {}, create: { ownerId: current.ownerId, type: "CREDIT", amountKobo: current.amountKobo, description: `Reversed owner withdrawal ${reference}`, sourceType: "WITHDRAWAL_REFUND", sourceId: current.id } });
      return tx.withdrawalRequest.update({ where: { id: current.id }, data: { status: "REFUNDED", providerSessionId: result.sessionId, providerResponse: result.raw as never, failureReason: "Provider reversed the transfer." } });
    }
    return tx.withdrawalRequest.update({ where: { id: current.id }, data: { status: result.status, providerSessionId: result.sessionId, providerResponse: result.raw as never, failureReason: result.status === "FAILED" ? "Provider reported a failed transfer." : undefined } });
  });
  if (updated.status === "PAID") await postJournal({ sourceType: "OWNER_WITHDRAWAL", sourceId: updated.id, entryDate: updated.paidAt!, description: `Paid owner withdrawal ${reference}`, lines: [{ accountKey: "OWNER_DISTRIBUTIONS_PAYABLE", debitKobo: updated.amountKobo }, { accountKey: "BANK", creditKobo: updated.amountKobo }] });
  if (updated.status === "REFUNDED" && wasPaid) await postJournal({ sourceType: "OWNER_WITHDRAWAL_REFUND", sourceId: updated.id, entryDate: new Date(), description: `Reversed owner withdrawal ${reference}`, lines: [{ accountKey: "BANK", debitKobo: updated.amountKobo }, { accountKey: "OWNER_DISTRIBUTIONS_PAYABLE", creditKobo: updated.amountKobo }] });
  return updated;
}

export async function verifyAndApplyStaffWithdrawal(reference: string) {
  const db = getDb(); const withdrawal = await db.staffWithdrawalRequest.findUnique({ where: { merchantReference: reference } }); if (!withdrawal) return null;
  const result = await verifyTransfer(reference);
  return db.$transaction(async (tx) => {
    const current = await tx.staffWithdrawalRequest.findUniqueOrThrow({ where: { id: withdrawal.id } });
    await tx.staffWithdrawalEvent.create({ data: { withdrawalId: current.id, type: "PROVIDER_VERIFICATION", payload: result.raw as never } });
    if (result.status === "PAID" && current.status !== "PAID") {
      await tx.staffWalletEntry.upsert({ where: { sourceType_sourceId_type: { sourceType: "WITHDRAWAL", sourceId: current.id, type: "WITHDRAWAL" } }, update: {}, create: { staffId: current.staffId, type: "WITHDRAWAL", amountKobo: current.amountKobo, description: `Staff withdrawal ${reference}`, memo: "Wallet withdrawal", sourceType: "WITHDRAWAL", sourceId: current.id } });
      return tx.staffWithdrawalRequest.update({ where: { id: current.id }, data: { status: "PAID", paidAt: new Date(), providerSessionId: result.sessionId, providerResponse: result.raw as never } });
    }
    if (result.status === "REFUNDED") {
      if (current.status === "PAID") await tx.staffWalletEntry.upsert({ where: { sourceType_sourceId_type: { sourceType: "WITHDRAWAL_REFUND", sourceId: current.id, type: "REVERSAL" } }, update: {}, create: { staffId: current.staffId, type: "REVERSAL", amountKobo: current.amountKobo, description: `Reversed staff withdrawal ${reference}`, memo: "Provider transfer reversal", sourceType: "WITHDRAWAL_REFUND", sourceId: current.id } });
      return tx.staffWithdrawalRequest.update({ where: { id: current.id }, data: { status: "REFUNDED", providerSessionId: result.sessionId, providerResponse: result.raw as never, failureReason: "Provider reversed the transfer." } });
    }
    return tx.staffWithdrawalRequest.update({ where: { id: current.id }, data: { status: result.status, providerSessionId: result.sessionId, providerResponse: result.raw as never, failureReason: result.status === "FAILED" ? "Provider reported a failed transfer." : undefined } });
  });
}
