import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizePhone } from "../src/lib/auth/validation";

const connectionString = process.env.DATABASE_URL;
const configuredPhone = process.env.BOOTSTRAP_ADMIN_PHONE;
if (!connectionString) throw new Error("DATABASE_URL is required.");
if (!configuredPhone) throw new Error("Set BOOTSTRAP_ADMIN_PHONE for this one-time command.");

const phone = normalizePhone(configuredPhone);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const [role, location, existingUser] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { name: "Super Admin" } }),
    prisma.location.findUniqueOrThrow({ where: { slug: "lagos" } }),
    prisma.user.findUnique({ where: { phone } }),
  ]);
  if (existingUser) throw new Error("A user already exists for BOOTSTRAP_ADMIN_PHONE. No invitation was created.");

  const active = await prisma.invitation.findFirst({ where: { phone, acceptedAt: null, expiresAt: { gt: new Date() } } });
  if (active) {
    console.log(`An active Super Admin invitation already exists for ${phone}.`);
    return;
  }

  const tokenHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  await prisma.invitation.create({
    data: {
      phone,
      roleId: role.id,
      locationId: location.id,
      salaryKobo: 0,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`Super Admin invitation created for ${phone}. Register that phone through the normal OTP flow within seven days.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
