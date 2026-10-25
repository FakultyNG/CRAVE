import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const auth = await apiPermission("marketing.manage"); if ("response" in auth) return auth.response; const { id } = await params; const campaign = await getDb().campaign.update({ where: { id }, data: z.object({ isActive: z.boolean() }).parse(await request.json()) }); return Response.json({ campaign }); } catch (error) { return handleApiError(error); } }
