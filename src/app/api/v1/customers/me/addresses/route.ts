import { connection } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

const schema = z.object({ label: z.string().trim().min(2).max(30), recipientName: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(25), line1: z.string().trim().min(4).max(160), area: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(80).default("Lagos"), landmark: z.string().trim().max(120).optional(), instructions: z.string().trim().max(300).optional(), isDefault: z.boolean().default(false) });

export async function GET() {
  await connection();
  try { const session = await getSession(); if (!session) return jsonError("Authentication required.", 401); return Response.json({ addresses: await getDb().address.findMany({ where: { userId: session.user.id }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] }) }); }
  catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try { const session = await getSession(); if (!session) return jsonError("Authentication required.", 401); const input = schema.parse(await request.json()); const db = getDb(); const address = await db.$transaction(async (tx) => { if (input.isDefault) await tx.address.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } }); return tx.address.create({ data: { ...input, userId: session.user.id } }); }); return Response.json({ address }, { status: 201 }); }
  catch (error) { return handleApiError(error); }
}
