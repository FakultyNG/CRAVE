"use client";

import { useEffect } from "react";

export function SessionKeeper() {
  useEffect(() => { void fetch("/api/v1/auth/session/refresh", { method: "POST", credentials: "same-origin" }).catch(() => undefined); }, []);
  return null;
}
