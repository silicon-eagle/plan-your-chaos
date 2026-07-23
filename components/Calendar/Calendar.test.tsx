import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Calendar } from "./Calendar";

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

  it("marks a selected date", () => {
    render(<Calendar initialDate={new Date(2026, 0, 15)} />);

    const day = screen.getByRole("button", {
      name: "Thursday, 15 January 2026",
    });
    fireEvent.click(day);

    expect(day).toHaveAttribute("aria-pressed", "true");
  });
});
