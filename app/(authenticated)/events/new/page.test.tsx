import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePageSession: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/lib/auth/authorization", () => ({
  requirePageSession: mocks.requirePageSession,
}));
vi.mock("@/db", () => ({
  db: { select: mocks.select },
}));
vi.mock("@/components/EventForm/EventForm", () => ({
  EventForm: () => <form aria-label="Event form" />,
}));
vi.mock("@/lib/events/icons", () => ({
  chooseRandomIcon: () => ({ id: 1 }),
}));
vi.mock("./actions", () => ({
  createEvent: vi.fn(),
}));

import NewEventPage from "./page";

describe("NewEventPage", () => {
  it("authenticates before loading users and icons", async () => {
    mocks.requirePageSession.mockRejectedValue(new Error("NEXT_REDIRECT"));
    mocks.select.mockReturnValue({
      from: vi.fn(() => ({
        orderBy: vi.fn().mockResolvedValue([]),
      })),
    });

    await expect(
      NewEventPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.select).not.toHaveBeenCalled();
  });
});
