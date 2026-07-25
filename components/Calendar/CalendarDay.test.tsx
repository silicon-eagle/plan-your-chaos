import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

    const link = screen.getByRole("link", {
      name: "Thursday, 15 January 2026, today",
    });
    expect(link).toHaveAttribute("aria-current", "date");
    expect(link).toHaveAttribute("href", "/day/2026-01-15");
    expect(screen.getByText("15")).toHaveAttribute("datetime", "2026-01-15");
  });

  it("renders attendee markers and the compact fallback", () => {
    render(
      <CalendarDay
        day={{
          date: new Date(2026, 0, 15),
          isCurrentMonth: true,
          isToday: false,
        }}
        eventMarkers={["tim", "veerle", "together"]}
      />,
    );

    const link = screen.getByRole("link", {
      name: "Thursday, 15 January 2026, 3 events",
    });
    expect(
      link.querySelector('img[src="/icons/eventMarker-tim.png"]'),
    ).toBeInTheDocument();
    expect(
      link.querySelector('img[src="/icons/eventMarker-veerle.png"]'),
    ).toBeInTheDocument();
    expect(
      link.querySelector('img[src="/icons/eventMarker-together.png"]'),
    ).toBeInTheDocument();
    expect(
      link.querySelectorAll('img[src="/icons/eventMarker.png"]'),
    ).toHaveLength(1);
  });
});
