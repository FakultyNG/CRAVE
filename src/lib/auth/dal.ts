import "server-only";

import { redirect } from "next/navigation";
import { getSession } from "./session";

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requirePermission(permission: string) {
  const session = await requireSession();
  if (!session.user.permissions.includes(permission)) redirect("/account?error=forbidden");
  return session;
}
