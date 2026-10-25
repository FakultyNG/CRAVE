import { lagosMonthKey, periodBounds } from "./core";

export function reportRange(url: string) {
  const params = new URL(url).searchParams;
  const now = new Date();
  const defaultFrom = periodBounds(lagosMonthKey(now)).startsAt;
  const from = params.get("from") ? new Date(`${params.get("from")}T00:00:00+01:00`) : defaultFrom;
  const to = params.get("to") ? new Date(`${params.get("to")}T23:59:59.999+01:00`) : now;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new Error("Choose a valid report date range.");
  return { from, to, locationId: params.get("locationId") || undefined };
}

export function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
