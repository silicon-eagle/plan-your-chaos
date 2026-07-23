import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DayPage from "./page";

describe("DayPage", () => {
  it("shows the requested date", async () => {
    const page = await DayPage({
      params: Promise.resolve({ date: "2026-01-15" }),
    });

    render(page);

    expect(
      screen.getByRole("heading", {
        name: "Welcome to Thursday, 15 January 2026",
      }),
    ).toBeInTheDocument();
  });
});
