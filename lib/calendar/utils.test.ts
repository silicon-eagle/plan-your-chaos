import { afterEach, describe, expect, it, vi } from "vitest";
import { getMonthCalendar } from "./utils";

function expectDate(date: Date, year: number, month: number, day: number) {
  expect([
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ]).toEqual([year, month, day]);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("getMonthCalendar", () => {
  it("returns Monday-to-Sunday weeks including adjacent month days", () => {
    const days = getMonthCalendar(2026, 0);

    expect(days).toHaveLength(35);
    expect(days[0].date.getDay()).toBe(1);
    expect(days.at(-1)?.date.getDay()).toBe(0);
    expectDate(days[0].date, 2025, 11, 29);
    expectDate(days.at(-1)!.date, 2026, 1, 1);
    expect(days.filter(({ isCurrentMonth }) => isCurrentMonth)).toHaveLength(
      31,
    );
  });

  it("uses four rows when a 28-day month starts on Monday", () => {
    const days = getMonthCalendar(2021, 1);

    expect(days).toHaveLength(28);
    expect(days.every(({ isCurrentMonth }) => isCurrentMonth)).toBe(true);
    expectDate(days[0].date, 2021, 1, 1);
    expectDate(days.at(-1)!.date, 2021, 1, 28);
  });

  it("uses six rows when the month does not fit in five", () => {
    const days = getMonthCalendar(2021, 4);

    expect(days).toHaveLength(42);
    expectDate(days[0].date, 2021, 3, 26);
    expectDate(days.at(-1)!.date, 2021, 5, 6);
  });

  it("includes February 29 in leap years", () => {
    const days = getMonthCalendar(2024, 1);
    const currentMonthDays = days.filter(({ isCurrentMonth }) => isCurrentMonth);

    expect(currentMonthDays).toHaveLength(29);
    expectDate(currentMonthDays.at(-1)!.date, 2024, 1, 29);
  });

  it("marks only today's date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 15, 12));

    const days = getMonthCalendar(2026, 6);
    const today = days.filter(({ isToday }) => isToday);

    expect(today).toHaveLength(1);
    expectDate(today[0].date, 2026, 6, 15);
  });

  it.each([
    [2026.5, 0, "year must be an integer"],
    [2026, -1, "month must be an integer between 0 and 11"],
    [2026, 12, "month must be an integer between 0 and 11"],
    [2026, 1.5, "month must be an integer between 0 and 11"],
  ])("rejects invalid input", (year, month, message) => {
    expect(() => getMonthCalendar(year, month)).toThrow(message);
  });
});
