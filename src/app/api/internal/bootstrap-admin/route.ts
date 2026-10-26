import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { jsonError, handleApiError } from "@/lib/api";
import { hashPin, hashToken } from "@/lib/auth/crypto";
import { normalizePhone } from "@/lib/auth/validation";
import { firstSalaryDueAt } from "@/lib/finance/calendar";

const expectedTokenHash = "3f2bdf261ca805d72acf98b9d53201d84294a2d2c6288916bbb7b446eee12570";
const inputSchema = z.object({
  preferredName: z.string().trim().min(2).max(50),
  phone: z.string().min(7).max(24),
  pin: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  try {
    const suppliedToken = request.headers.get("x-bootstrap-token");
    if (!suppliedToken) return jsonError("Not found.", 404);
    const suppliedHash = Buffer.from(hashToken(suppliedToken), "hex");
    const expectedHash = Buffer.from(expectedTokenHash, "hex");
    if (suppliedHash.length !== expectedHash.length || !timingSafeEqual(suppliedHash, expectedHash)) {
      return jsonError("Not found.", 404);
    }

    const input = inputSchema.parse(await request.json());
    const phone = normalizePhone(input.phone);
    const pinHash = await hashPin(input.pin);
    const db = getDb();

    const user = await db.$transaction(async (transaction) => {
      if (await transaction.user.count()) throw new Error("Administrator bootstrap is no longer available.");
      const [role, location] = await Promise.all([
        transaction.role.findUniqueOrThrow({ where: { name: "Super Admin" } }),
        transaction.location.findUniqueOrThrow({ where: { slug: "lagos" } }),
      ]);
      const created = await transaction.user.create({
        data: {
          preferredName: input.preferredName,
          phone,
          phoneVerifiedAt: new Date(),
          pinHash,
          status: "ACTIVE",
          staffProfile: {
            create: {
              roleId: role.id,
              locationId: location.id,
              status: "ACTIVE",
              salaryKobo: 0,
              nextSalaryAt: firstSalaryDueAt(),
            },
          },
        },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: created.id,
          action: "admin.bootstrap",
          entityType: "User",
          entityId: created.id,
        },
      });
      return created;
    });

    return Response.json({ data: { id: user.id, preferredName: user.preferredName } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
