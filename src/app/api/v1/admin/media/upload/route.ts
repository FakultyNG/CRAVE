import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { apiPermission } from "@/lib/auth/api";
import { getDb } from "@/lib/db";
import { handleApiError, jsonError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const auth = await apiPermission("media.manage"); if ("response" in auth) return auth.response;
    if (!process.env.BLOB_READ_WRITE_TOKEN) return jsonError("Media storage is not configured.", 503);
    const body = await request.json() as HandleUploadBody;
    const response = await handleUpload({ body, request, onBeforeGenerateToken: async (_pathname, clientPayload) => { const payload = JSON.parse(clientPayload ?? "{}") as { productId?: string; altText?: string }; if (!payload.productId || !payload.altText) throw new Error("Product and alt text are required."); const product = await getDb().product.findUnique({ where: { id: payload.productId } }); if (!product) throw new Error("Product not found."); return { allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"], maximumSizeInBytes: 50 * 1024 * 1024, addRandomSuffix: true, tokenPayload: JSON.stringify({ ...payload, actorUserId: auth.session.user.id }) }; }, onUploadCompleted: async ({ blob, tokenPayload }) => { const payload = JSON.parse(tokenPayload ?? "{}") as { productId: string; altText: string; actorUserId: string }; const type = blob.contentType?.startsWith("video/") ? "VIDEO" : "IMAGE"; const db = getDb(); await db.productMedia.create({ data: { productId: payload.productId, type, url: blob.url, altText: payload.altText } }); await db.auditLog.create({ data: { actorUserId: payload.actorUserId, action: "media.upload", entityType: "Product", entityId: payload.productId, metadata: { url: blob.url, type } } }); } });
    return Response.json(response);
  } catch (error) { return handleApiError(error); }
}
