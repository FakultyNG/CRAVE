import "server-only";
import type { WithdrawalStatus } from "@/generated/prisma/client";

function publicKey() { const value = process.env.STROWALLET_PUBLIC_KEY; if (!value) throw new Error("STROWALLET_PUBLIC_KEY is required."); return value; }
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function nested(raw: unknown) { const root = object(raw); return { root, data: object(root.data) }; }
function text(source: Record<string, unknown>, keys: string[]) { for (const key of keys) if (typeof source[key] === "string" && source[key]) return source[key] as string; }

async function strowalletRequest(url: URL, method = "GET") { const response = await fetch(url, { method, headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15_000) }); const raw: unknown = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`Strowallet payout request failed (${response.status}).`); return raw; }

export async function getStrowalletBanks() {
  const url = new URL("https://strowallet.com/api/banks/lists/"); url.searchParams.set("public_key", publicKey()); const raw = await strowalletRequest(url); const { root, data } = nested(raw); const candidates = [root.data, data.banks, root.banks, raw]; const list = candidates.find(Array.isArray) as unknown[] | undefined;
  return { banks: (list ?? []).map(object).map((bank) => ({ name: text(bank, ["name", "bank_name", "bankName"]) ?? "Unknown bank", code: text(bank, ["code", "bank_code", "bankCode"]) ?? "" })).filter((bank) => bank.code), raw };
}

export async function enquireStrowalletAccount(bankCode: string, accountNumber: string) {
  const url = new URL("https://strowallet.com/api/banks/get-customer-name/"); url.search = new URLSearchParams({ public_key: publicKey(), bank_code: bankCode, account_number: accountNumber }).toString(); const raw = await strowalletRequest(url); const { root, data } = nested(raw);
  const accountName = text(data, ["account_name", "accountName", "name"]) ?? text(root, ["account_name", "accountName", "name"]); const reference = text(data, ["name_enquiry_reference", "reference", "sessionId"]) ?? text(root, ["name_enquiry_reference", "reference", "sessionId"]);
  if (!accountName || !reference) throw new Error("Strowallet could not confirm that account."); return { accountName, reference, raw };
}

export async function requestStrowalletTransfer(input: { amountKobo: number; bankCode: string; accountNumber: string; narration: string; nameEnquiryReference: string; senderName: string }) {
  const url = new URL("https://strowallet.com/api/banks/request/"); url.search = new URLSearchParams({ public_key: publicKey(), amount: (input.amountKobo / 100).toFixed(2), bank_code: input.bankCode, account_number: input.accountNumber, narration: input.narration, name_enquiry_reference: input.nameEnquiryReference, SenderName: input.senderName, mode: process.env.STROWALLET_TRANSFER_MODE ?? "sandbox" }).toString(); const raw = await strowalletRequest(url, "POST"); const { root, data } = nested(raw);
  const merchantReference = text(data, ["merchantTxRef", "merchant_reference", "reference"]) ?? text(root, ["merchantTxRef", "merchant_reference", "reference"]); const sessionId = text(data, ["sessionId", "session_id"]) ?? text(root, ["sessionId", "session_id"]); if (!merchantReference) throw new Error("Strowallet did not return a transfer reference."); return { merchantReference, sessionId, raw };
}

export async function verifyStrowalletTransfer(merchantReference: string) {
  const url = new URL("https://strowallet.com/api/VerifyWebHookTranfer"); url.search = new URLSearchParams({ public_key: publicKey(), merchantTxRef: merchantReference }).toString(); const raw = await strowalletRequest(url); const { root, data } = nested(raw); const rawStatus = String(data.status ?? root.status ?? data.event ?? root.event ?? "").toLowerCase();
  const status: WithdrawalStatus = rawStatus.includes("success") ? "PAID" : rawStatus.includes("refund") || rawStatus.includes("revers") ? "REFUNDED" : rawStatus.includes("fail") ? "FAILED" : "PROCESSING";
  return { status, sessionId: text(data, ["sessionId", "session_id"]) ?? text(root, ["sessionId", "session_id"]), raw };
}
