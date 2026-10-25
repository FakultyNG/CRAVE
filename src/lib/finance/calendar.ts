const lagosParts = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])) as { year: number; month: number; day: number };

function monthEndStartUtc(year: number, month: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, lastDay, 0, 0, 0) - 60 * 60 * 1000);
}

export function isLastCalendarDayInLagos(date = new Date()) {
  const { year, month, day } = lagosParts(date);
  return day === new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function firstSalaryDueAt(startedAt = new Date()) {
  const { year, month, day } = lagosParts(startedAt);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < lastDay) return monthEndStartUtc(year, month);
  const next = new Date(Date.UTC(year, month, 1));
  return monthEndStartUtc(next.getUTCFullYear(), next.getUTCMonth() + 1);
}

export function followingSalaryDueAt(dueAt: Date) {
  const { year, month } = lagosParts(new Date(dueAt.getTime() + 60 * 60 * 1000));
  const next = new Date(Date.UTC(year, month, 1));
  return monthEndStartUtc(next.getUTCFullYear(), next.getUTCMonth() + 1);
}

export function salaryPeriodKey(dueAt: Date) {
  const { year, month } = lagosParts(new Date(dueAt.getTime() + 60 * 60 * 1000));
  return `${year}-${String(month).padStart(2, "0")}`;
}
