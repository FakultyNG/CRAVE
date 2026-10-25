import { connection } from "next/server";
import { z } from "zod";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";
import { postJournal } from "@/lib/accounting/core";

export async function GET() { await connection(); try { const auth = await apiPermission("accounting.read"); if ("response" in auth) return auth.response; return Response.json({ settlements: await getDb().paymentSettlement.findMany({ include: { paymentIntent: true, location: true }, orderBy: { createdAt: "desc" }, take: 250 }) }); } catch (error) { return handleApiError(error); } }

export async function POST(request: Request) {
  try {
    const auth = await apiPermission("accounting.manage"); if ("response" in auth) return auth.response;
    const input = z.object({ providerReference: z.string().trim().min(3), grossAmountKobo: z.number().int().positive(), processingFeeKobo: z.number().int().min(0), status: z.enum(["PENDING", "SETTLED", "FAILED"]).default("SETTLED"), settledAt: z.coerce.date().optional(), locationId: z.string().optional().nullable() }).parse(await request.json());
    if (input.processingFeeKobo >= input.grossAmountKobo) return jsonError("Processing fee must be lower than the gross settlement.", 422);
    const db = getDb(); const paymentIntent = await db.paymentIntent.findFirst({ where: { OR: [{ providerReference: input.providerReference }, { merchantReference: input.providerReference }] } });
    const settlement = await db.$transaction(async (tx) => { const created = await tx.paymentSettlement.create({ data: { ...input, netAmountKobo: input.grossAmountKobo - input.processingFeeKobo, paymentIntentId: paymentIntent?.id, settledAt: input.status === "SETTLED" ? input.settledAt ?? new Date() : null } }); await tx.auditLog.create({ data: { actorUserId: auth.session.user.id, action: "accounting.settlement.record", entityType: "PaymentSettlement", entityId: created.id, metadata: { providerReference: created.providerReference, grossAmountKobo: created.grossAmountKobo } } }); return created; });
    if (settlement.status === "SETTLED") await postJournal({ sourceType: "PAYMENT_SETTLEMENT", sourceId: settlement.id, entryDate: settlement.settledAt!, description: `Settlement ${settlement.providerReference}`, createdById: auth.session.user.id, lines: [{ accountKey: "BANK", debitKobo: settlement.netAmountKobo, locationId: settlement.locationId }, ...(settlement.processingFeeKobo ? [{ accountKey: "PROCESSING_FEES", debitKobo: settlement.processingFeeKobo, locationId: settlement.locationId }] : []), { accountKey: "PAYMENT_CLEARING", creditKobo: settlement.grossAmountKobo, locationId: settlement.locationId }] });
    return Response.json({ settlement }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
