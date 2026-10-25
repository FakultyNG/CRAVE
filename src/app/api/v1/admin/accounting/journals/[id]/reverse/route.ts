import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { handleApiError } from "@/lib/api";
import { reverseJournal } from "@/lib/accounting/core";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const auth = await apiPermission("accounting.manage"); if ("response" in auth) return auth.response; const { reason } = z.object({ reason: z.string().trim().min(5).max(300) }).parse(await request.json()); const { id } = await params; return Response.json({ entry: await reverseJournal(id, auth.session.user.id, reason) }); } catch (error) { return handleApiError(error); }
}
