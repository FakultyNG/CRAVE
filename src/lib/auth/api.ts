import "server-only";

import { getSession } from "./session";
import { jsonError } from "@/lib/api";

export async function apiSession() {
  const session = await getSession();
  return session ? { session } : { response: jsonError("Authentication required.", 401) };
}

export async function apiPermission(permission: string) {
  const auth = await apiSession();
  if ("response" in auth) return auth;
  return auth.session.user.permissions.includes(permission) ? auth : { response: jsonError("You do not have permission to perform this action.", 403) };
}

export async function apiOwner() {
  const auth = await apiSession();
  if ("response" in auth) return auth;
  return auth.session.user.role === "Owner" ? auth : { response: jsonError("Owner access required.", 403) };
}

export async function apiStaff() {
  const auth = await apiSession();
  if ("response" in auth) return auth;
  if (auth.session.user.role === "Customer" || auth.session.user.role === "Owner") return { response: jsonError("Staff access required.", 403) };
  return auth;
}
