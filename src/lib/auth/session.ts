import "server-only";

import { cookies, headers } from "next/headers";
import { getDb } from "@/lib/db";
import { hashToken, randomToken } from "./crypto";
import { SESSION_COOKIE, SESSION_TTL_MS } from "./constants";

function expiry() {
  return new Date(Date.now() + SESSION_TTL_MS);
}

const cookieOptions = (expires: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires,
  priority: "high" as const,
});

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = expiry();
  const headerStore = await headers();
  await getDb().session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: headerStore.get("user-agent")?.slice(0, 500),
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export async function getSession({ renew = false } = {}) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          staffProfile: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
          ownerProfile: true,
          userPermissions: { include: { permission: true } },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    return null;
  }

  if (renew) {
    const expiresAt = expiry();
    await db.session.update({ where: { id: session.id }, data: { expiresAt, lastSeenAt: new Date() } });
    (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
  }

  const rolePermissions = session.user.ownerProfile ? ["owners.read", "payouts.request"] : session.user.staffProfile?.role.permissions.map((item) => item.permission.key) ?? [];
  const overrides = new Map(session.user.userPermissions.map((item) => [item.permission.key, item.granted]));
  const permissions = new Set(rolePermissions.filter((key) => overrides.get(key) !== false));
  for (const [key, granted] of overrides) if (granted) permissions.add(key);

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      preferredName: session.user.preferredName,
      phone: session.user.phone,
      role: session.user.ownerProfile ? "Owner" : session.user.staffProfile?.role.name ?? "Customer",
      permissions: [...permissions],
    },
  };
}

export async function endSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await getDb().session.updateMany({ where: { tokenHash: hashToken(token) }, data: { revokedAt: new Date() } });
  }
  cookieStore.delete(SESSION_COOKIE);
}
