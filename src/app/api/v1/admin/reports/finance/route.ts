import { connection } from "next/server";
import { apiPermission } from "@/lib/auth/api";
import { handleApiError } from "@/lib/api";
import { financialReport } from "@/lib/accounting/reports";
import { reportRange } from "@/lib/accounting/query";

export async function GET(request: Request) { await connection(); try { const auth = await apiPermission("reports.read"); if ("response" in auth) return auth.response; const range = reportRange(request.url); return Response.json({ report: await financialReport(range.from, range.to, range.locationId) }); } catch (error) { return handleApiError(error); } }
