import { connection } from "next/server";
import { apiSession } from "@/lib/auth/api";
import { getStrowalletBanks } from "@/lib/payouts/strowallet";
import { handleApiError, jsonError } from "@/lib/api";

export async function GET() { await connection(); try { const auth = await apiSession(); if ("response" in auth) return auth.response; if (auth.session.user.role === "Customer") return jsonError("Staff or owner access required.", 403); return Response.json({ banks: (await getStrowalletBanks()).banks }); } catch (error) { return handleApiError(error); } }
