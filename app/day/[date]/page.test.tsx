import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const eventListMock = vi.hoisted(() =>
  vi.fn((_props: { from: Date; to: Date }) => <div>Event list</div>),
);

vi.mock("@/components/EventList/EventList", () => ({
  EventList: eventListMock,
}));

import DayPage from "./page";

describe("DayPage", () => {
  it("shows the requested date", async () => {
    const page = await DayPage({
      params: Promise.resolve({ date: "2026-01-15" }),
    });

    render(page);

    expect(
      screen.getByRole("heading", {
        name: "Thursday, 15 January 2026",
      }),
    ).toBeInTheDocument();

    const { from, to } = eventListMock.mock.calls[0][0];
    expect(to.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
