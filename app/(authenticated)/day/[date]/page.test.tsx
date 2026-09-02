import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePageSession: vi.fn(),
  eventList: vi.fn((_props: { from: Date; to: Date }) => <div>Event list</div>),
}));

vi.mock("@/lib/auth/authorization", () => ({
  requirePageSession: mocks.requirePageSession,
}));

vi.mock("@/components/EventList/EventList", () => ({
  EventList: mocks.eventList,
}));

import DayPage from "./page";

describe("DayPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageSession.mockResolvedValue({
      id: 1,
      user: { id: 1, name: "Alice", avatarPath: null },
      createdAt: new Date(),
      lastActiveAt: new Date(),
      idleExpiresAt: new Date(),
      absoluteExpiresAt: new Date(),
    });
  });

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

    const { from, to } = mocks.eventList.mock.calls[0][0];
    expect(to.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
