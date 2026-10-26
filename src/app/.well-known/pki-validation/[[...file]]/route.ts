const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "text/plain; charset=utf-8",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file?: string[] }> },
) {
  const { file } = await params;

  if (!file?.length) {
    return new Response("PKI validation endpoint ready.\n", { headers: responseHeaders });
  }

  const configuredFilename = process.env.PKI_VALIDATION_FILENAME;
  const configuredContent = process.env.PKI_VALIDATION_CONTENT_BASE64;
  if (file.length !== 1 || !configuredFilename || file[0] !== configuredFilename || !configuredContent) {
    return new Response("Not found.\n", { status: 404, headers: responseHeaders });
  }

  try {
    const content = Buffer.from(configuredContent, "base64").toString("utf8");
    return new Response(content, { headers: responseHeaders });
  } catch {
    return new Response("Validation content is not configured correctly.\n", { status: 500, headers: responseHeaders });
  }
}
