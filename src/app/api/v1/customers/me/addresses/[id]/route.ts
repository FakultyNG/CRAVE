import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const session = await getSession(); if (!session) return jsonError("Authentication required.", 401); const { id } = await params; const result = await getDb().address.deleteMany({ where: { id, userId: session.user.id } }); return result.count ? new Response(null, { status: 204 }) : jsonError("Address not found.", 404); }
  catch (error) { return handleApiError(error); }
}
