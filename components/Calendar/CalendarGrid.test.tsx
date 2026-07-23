import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getMonthCalendar } from "@/lib/calendar/utils";
import { CalendarGrid } from "./CalendarGrid";

describe("CalendarGrid", () => {
  it("renders Monday-first weekday labels and every calendar day", () => {
    render(<CalendarGrid days={getMonthCalendar(2021, 1)} />);

    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    weekdays.forEach((weekday) => {
      expect(screen.getByText(weekday)).toBeInTheDocument();
    });
    expect(screen.getAllByRole("button")).toHaveLength(28);
  });

  it("marks and selects the selected date", () => {
    const onDayClick = vi.fn();
    const selectedDate = new Date(2021, 1, 15);

    render(
      <CalendarGrid
        days={getMonthCalendar(2021, 1)}
        selectedDate={selectedDate}
        onDayClick={onDayClick}
      />,
    );

    const selectedDay = screen
      .getAllByRole("button")
      .find((button) => button.getAttribute("aria-pressed") === "true");

    expect(selectedDay).toBeDefined();
    fireEvent.click(selectedDay!);
    expect(onDayClick).toHaveBeenCalledWith(
      expect.objectContaining({
        getTime: expect.any(Function),
      }),
    );
    expect(onDayClick.mock.calls[0][0].getTime()).toBe(selectedDate.getTime());
  });
});
