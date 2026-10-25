import { z } from "zod";
import { apiOwner } from "@/lib/auth/api";
import { enquireStrowalletAccount } from "@/lib/payouts/strowallet";
import { handleApiError } from "@/lib/api";

export async function POST(request: Request) { try { const auth = await apiOwner(); if ("response" in auth) return auth.response; const input = z.object({ bankCode: z.string().min(2).max(20), accountNumber: z.string().regex(/^\d{10}$/) }).parse(await request.json()); const result = await enquireStrowalletAccount(input.bankCode, input.accountNumber); return Response.json({ accountName: result.accountName, nameEnquiryReference: result.reference }); } catch (error) { return handleApiError(error); } }
