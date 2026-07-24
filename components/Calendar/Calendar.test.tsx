import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Calendar } from "./Calendar";

afterEach(() => {
  vi.useRealTimers();
});

describe("Calendar", () => {
  it("shows the initial month and navigates across year boundaries", () => {
    render(<Calendar initialDate={new Date(2026, 0, 15)} />);

    expect(
      screen.getByRole("heading", { name: "January 2026" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(
      screen.getByRole("heading", { name: "December 2025" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(
      screen.getByRole("heading", { name: "February 2026" }),
    ).toBeInTheDocument();
  });

  it("returns to the current month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 24, 12));
    render(<Calendar initialDate={new Date(2026, 0, 15)} />);

    fireEvent.click(screen.getByRole("button", { name: "Current month" }));

    expect(
      screen.getByRole("heading", { name: "July 2026" }),
    ).toBeInTheDocument();
  });

  it("links dates to their day pages", () => {
    render(<Calendar initialDate={new Date(2026, 0, 15)} />);

    const day = screen.getByRole("link", {
      name: "Thursday, 15 January 2026",
    });
    expect(day).toHaveAttribute("href", "/day/2026-01-15");
  });
});
