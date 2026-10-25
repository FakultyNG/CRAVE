import { z } from "zod";
import { apiSession } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { SALARY_FUNDING_KEY, salaryFundingSource } from "@/lib/finance/payroll-settings";
import { handleApiError, jsonError } from "@/lib/api";

function ensureSuperAdmin(role: string) { return role === "Super Admin" ? null : jsonError("Only the Super Admin can change salary funding.", 403); }
export async function GET() { try { const auth = await apiSession(); if ("response" in auth) return auth.response; const denied = ensureSuperAdmin(auth.session.user.role); if (denied) return denied; return Response.json({ source: await salaryFundingSource() }); } catch (error) { return handleApiError(error); } }
export async function PUT(request: Request) { try { const auth = await apiSession(); if ("response" in auth) return auth.response; const denied = ensureSuperAdmin(auth.session.user.role); if (denied) return denied; const { source } = z.object({ source: z.enum(["PREFUNDED_CAPITAL", "GROSS_REVENUE"]) }).parse(await request.json()); const db = getDb(); await db.$transaction(async (tx) => { await tx.setting.upsert({ where: { key: SALARY_FUNDING_KEY }, update: { value: source }, create: { key: SALARY_FUNDING_KEY, value: source } }); await tx.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "payroll.funding-source.change", entityType: "Setting", entityId: SALARY_FUNDING_KEY, metadata: { source } } }); }); return Response.json({ source }); } catch (error) { return handleApiError(error); } }
