import "dotenv/config";
import { createHash, randomBytes, scrypt as nodeScrypt } from "node:crypto";
import { promisify } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizePhone } from "../src/lib/auth/validation";
import { firstSalaryDueAt } from "../src/lib/finance/calendar";

const connectionString = process.env.DATABASE_URL;
const configuredPhone = process.env.BOOTSTRAP_ADMIN_PHONE;
const configuredPin = process.env.BOOTSTRAP_ADMIN_PIN;
const configuredName = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Super Admin";
const optional = process.argv.includes("--if-configured");
if (!connectionString) throw new Error("DATABASE_URL is required.");
if (!configuredPhone && !optional) throw new Error("Set BOOTSTRAP_ADMIN_PHONE for this one-time command.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const scrypt = promisify(nodeScrypt);

async function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(pin, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function main() {
  if (!configuredPhone) {
    console.log("BOOTSTRAP_ADMIN_PHONE is not configured; skipping administrator bootstrap.");
    return;
  }

  const phone = normalizePhone(configuredPhone);
  const [role, location, existingUser] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { name: "Super Admin" } }),
    prisma.location.findUniqueOrThrow({ where: { slug: "lagos" } }),
    prisma.user.findUnique({ where: { phone }, include: { staffProfile: true } }),
  ]);

  if (existingUser?.staffProfile?.roleId === role.id && existingUser.pinHash) {
    console.log("The configured Super Admin account already exists; leaving its PIN unchanged.");
    return;
  }

  if (configuredPin) {
    if (!/^\d{6}$/.test(configuredPin)) throw new Error("BOOTSTRAP_ADMIN_PIN must contain exactly six digits.");
    const pinHash = await hashPin(configuredPin);
    const user = await prisma.user.upsert({
      where: { phone },
      update: { preferredName: configuredName, phoneVerifiedAt: new Date(), pinHash, status: "ACTIVE", deletedAt: null },
      create: { preferredName: configuredName, phone, phoneVerifiedAt: new Date(), pinHash, status: "ACTIVE" },
    });
    await prisma.staffProfile.upsert({
      where: { userId: user.id },
      update: { roleId: role.id, locationId: location.id, status: "ACTIVE" },
      create: { userId: user.id, roleId: role.id, locationId: location.id, status: "ACTIVE", salaryKobo: 0, nextSalaryAt: firstSalaryDueAt() },
    });
    console.log("Super Admin account is ready. Remove the bootstrap credentials from the service variables.");
    return;
  }

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
