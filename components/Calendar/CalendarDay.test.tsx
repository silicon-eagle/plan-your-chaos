import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarDay } from "./CalendarDay";

describe("CalendarDay", () => {
  it("renders the date and exposes today semantically", () => {
    render(
      <CalendarDay
        day={{
          date: new Date(2026, 0, 15),
          isCurrentMonth: true,
          isToday: true,
        }}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Thursday, 15 January 2026, today",
    });
    expect(button).toHaveAttribute("aria-current", "date");
    expect(screen.getByText("15")).toHaveAttribute("datetime", "2026-01-15");
  });

  it("selects the supplied date", () => {
    const onClick = vi.fn();
    const date = new Date(2026, 0, 15);

    render(
      <CalendarDay
        day={{ date, isCurrentMonth: true, isToday: false }}
        isSelected
        onClick={onClick}
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledWith(date);
  });
});
