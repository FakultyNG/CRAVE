import { describe, expect, it } from "vitest";
import { firstSalaryDueAt, followingSalaryDueAt, isLastCalendarDayInLagos, salaryPeriodKey } from "./calendar";

describe("Lagos month end", () => {
  it("handles leap years", () => { expect(isLastCalendarDayInLagos(new Date("2028-02-29T12:00:00Z"))).toBe(true); expect(isLastCalendarDayInLagos(new Date("2028-02-28T12:00:00Z"))).toBe(false); });
  it("uses Lagos local time at the boundary", () => expect(isLastCalendarDayInLagos(new Date("2026-04-29T23:30:00Z"))).toBe(true));
});

describe("staff salary due dates", () => {
  it("makes salary available at the start of the last Lagos calendar day", () => {
    expect(firstSalaryDueAt(new Date("2026-10-10T10:00:00Z")).toISOString()).toBe("2026-10-30T23:00:00.000Z");
  });
  it("moves a staff member created on payday to the following month", () => {
    expect(firstSalaryDueAt(new Date("2026-10-31T10:00:00Z")).toISOString()).toBe("2026-11-29T23:00:00.000Z");
  });
  it("advances without losing the Lagos payroll period", () => {
    const next = followingSalaryDueAt(new Date("2026-11-29T23:00:00.000Z"));
    expect(next.toISOString()).toBe("2026-12-30T23:00:00.000Z");
    expect(salaryPeriodKey(next)).toBe("2026-12");
  });
});
