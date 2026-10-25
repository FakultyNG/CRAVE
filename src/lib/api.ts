import { ZodError } from "zod";

export function jsonError(message: string, status = 400, fields?: Record<string, string[] | undefined>) {
  return Response.json({ error: { message, fields } }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("Check the highlighted details.", 422, error.flatten().fieldErrors);
  }
  console.error(error);
  const message = process.env.NODE_ENV === "production" ? "Something went wrong. Please try again." : error instanceof Error ? error.message : "Something went wrong.";
  return jsonError(message, 500);
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? undefined;
}
