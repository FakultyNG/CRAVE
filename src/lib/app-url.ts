export function normalizeAppOrigin(value: string | undefined, fallback: string) {
  const configured = value?.trim() || fallback;
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(configured);
  if (hasScheme && !/^https?:\/\//i.test(configured)) {
    throw new Error("NEXT_PUBLIC_APP_URL must use http:// or https://.");
  }

  const candidate = hasScheme ? configured : `https://${configured}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be a valid web address.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_APP_URL must use http:// or https://.");
  }

  return url.origin;
}

export function appOrigin(fallback = "http://localhost:3000") {
  return normalizeAppOrigin(process.env.NEXT_PUBLIC_APP_URL, fallback);
}
