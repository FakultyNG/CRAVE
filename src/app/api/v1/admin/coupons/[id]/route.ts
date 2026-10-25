import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const auth = await apiPermission("coupons.manage"); if ("response" in auth) return auth.response; const input = z.object({ isActive: z.boolean() }).parse(await request.json()); const { id } = await params; const coupon = await getDb().coupon.update({ where: { id }, data: input }); return Response.json({ coupon }); } catch (error) { return handleApiError(error); } }
