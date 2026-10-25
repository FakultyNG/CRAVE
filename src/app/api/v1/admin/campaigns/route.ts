import { connection } from "next/server";
import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api";

const schema = z.object({ name: z.string().trim().min(2).max(80), headline: z.string().trim().min(2).max(120), body: z.string().trim().max(500).optional(), callToAction: z.string().trim().max(40).optional(), destinationUrl: z.string().trim().max(300).optional(), startsAt: z.coerce.date(), endsAt: z.coerce.date().nullable().optional(), isActive: z.boolean().default(false) });
export async function GET() { await connection(); try { const auth = await apiPermission("marketing.manage"); if ("response" in auth) return auth.response; return Response.json({ campaigns: await getDb().campaign.findMany({ orderBy: { createdAt: "desc" } }) }); } catch (error) { return handleApiError(error); } }
export async function POST(request: Request) { try { const auth = await apiPermission("marketing.manage"); if ("response" in auth) return auth.response; const campaign = await getDb().campaign.create({ data: schema.parse(await request.json()) }); return Response.json({ campaign }, { status: 201 }); } catch (error) { return handleApiError(error); } }
