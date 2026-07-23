import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getMonthCalendar } from "@/lib/calendar/utils";
import { CalendarGrid } from "./CalendarGrid";

describe("CalendarGrid", () => {
  it("renders Monday-first weekday labels and every calendar day", () => {
    render(<CalendarGrid days={getMonthCalendar(2021, 1)} />);

    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    weekdays.forEach((weekday) => {
      expect(screen.getByText(weekday)).toBeInTheDocument();
    });
    expect(screen.getAllByRole("link")).toHaveLength(28);
  });

  it("links each day to its date page", () => {
    render(<CalendarGrid days={getMonthCalendar(2021, 1)} />);

    expect(
      screen.getByRole("link", { name: "Monday, 15 February 2021" }),
    ).toHaveAttribute("href", "/day/2021-02-15");
  });
});
