import { z } from "zod";
import { apiSession } from "@/lib/auth/api";
import { enquireStrowalletAccount } from "@/lib/payouts/strowallet";
import { handleApiError, jsonError } from "@/lib/api";

export async function POST(request: Request) { try { const auth = await apiSession(); if ("response" in auth) return auth.response; if (auth.session.user.role === "Customer") return jsonError("Staff or owner access required.", 403); const input = z.object({ bankCode: z.string().min(2).max(20), accountNumber: z.string().regex(/^\d{10}$/) }).parse(await request.json()); const result = await enquireStrowalletAccount(input.bankCode, input.accountNumber); return Response.json({ accountName: result.accountName, nameEnquiryReference: result.reference }); } catch (error) { return handleApiError(error); } }
