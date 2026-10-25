import { connection } from "next/server";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET() { await connection(); try { const auth = await apiPermission("profit.calculate"); if ("response" in auth) return auth.response; const db = getDb(); const [periods, calculations] = await Promise.all([db.financialPeriod.findMany({ where: { status: "CLOSED" }, orderBy: { startsAt: "desc" } }), db.profitCalculation.findMany({ include: { period: true, calculatedBy: { select: { preferredName: true } }, approvals: { include: { approver: { select: { preferredName: true } } } }, allocations: { include: { owner: { include: { user: { select: { preferredName: true } } } } } } }, orderBy: { createdAt: "desc" } })]); return Response.json({ periods, calculations, canApprove: auth.session.user.permissions.includes("profit.approve") }); } catch (error) { return handleApiError(error); } }
