export type AuthDestination = "/account" | "/admin" | "/owner";

export function destinationForRole(role: string): AuthDestination {
  if (role === "Owner") return "/owner";
  if (role !== "Customer") return "/admin";
  return "/account";
}
