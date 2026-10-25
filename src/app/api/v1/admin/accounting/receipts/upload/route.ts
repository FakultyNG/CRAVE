import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { apiPermission } from "@/lib/auth/api";
import { handleApiError, jsonError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const auth = await apiPermission("accounting.manage"); if ("response" in auth) return auth.response;
    if (!process.env.BLOB_READ_WRITE_TOKEN) return jsonError("Receipt storage is not configured.", 503);
    const body = await request.json() as HandleUploadBody;
    return Response.json(await handleUpload({
      body, request,
      onBeforeGenerateToken: async () => ({ allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"], maximumSizeInBytes: 10 * 1024 * 1024, addRandomSuffix: true, tokenPayload: JSON.stringify({ actorUserId: auth.session.user.id }) }),
      onUploadCompleted: async () => {},
    }));
  } catch (error) { return handleApiError(error); }
}
