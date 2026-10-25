import { connection } from "next/server";
import { apiOwner } from "@/lib/auth/api";
import { getStrowalletBanks } from "@/lib/payouts/strowallet";
import { handleApiError } from "@/lib/api";

export async function GET() { await connection(); try { const auth = await apiOwner(); if ("response" in auth) return auth.response; const result = await getStrowalletBanks(); return Response.json({ banks: result.banks }); } catch (error) { return handleApiError(error); } }
