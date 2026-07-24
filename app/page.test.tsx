import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/EventList/EventList", () => ({
  EventList: () => <div>Upcoming event list</div>,
}));

import Home from "./page";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ events: [] }), { status: 200 }),
      ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Home", () => {
  it("renders the calendar and upcoming events", () => {
    render(<Home />);

    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next month" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Upcoming event list")).toBeInTheDocument();
  });
});
