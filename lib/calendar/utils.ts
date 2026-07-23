export type CalendarDayData = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export function mondayFirstRepresentation(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);

  return result;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getMonthCalendar(
  year: number,
  month: number,
): CalendarDayData[] {
  if (!Number.isInteger(year)) {
    throw new RangeError("year must be an integer");
  }

  if (!Number.isInteger(month) || month < 0 || month > 11) {
    throw new RangeError("month must be an integer between 0 and 11");
  }

  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = mondayFirstRepresentation(firstDayOfMonth);
  const daysInMonth = getDaysInMonth(year, month);
  const rows = Math.ceil((startOffset + daysInMonth) / 7);
  const gridStart = addDays(firstDayOfMonth, -startOffset);
  const today = new Date();

  return Array.from({ length: rows * 7 }, (_, index) => {
    const date = addDays(gridStart, index);

    return {
      date,
      isCurrentMonth:
        date.getFullYear() === year && date.getMonth() === month,
      isToday: isSameDay(date, today),
    };
  });
}

export function getMonthLabel(date: Date) {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
