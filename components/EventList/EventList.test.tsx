import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  select: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({
  requireSession: mocks.requireSession,
}));
vi.mock("@/db", () => ({
  db: { select: mocks.select },
}));
vi.mock("./EventListClient", () => ({
  EventListClient: () => <div>Event list</div>,
}));

import { EventList } from "./EventList";

describe("EventList", () => {
  it("authenticates before running list and filter queries", async () => {
    mocks.requireSession.mockRejectedValue(new Error("Authentication required"));
    mocks.select.mockReturnValue({
      from: vi.fn(() => ({
        orderBy: vi.fn().mockResolvedValue([]),
      })),
    });

    await expect(
      EventList({
        from: new Date("2026-08-01T00:00:00.000Z"),
        to: new Date("2026-09-01T00:00:00.000Z"),
      }),
    ).rejects.toThrow("Authentication required");

    expect(mocks.select).not.toHaveBeenCalled();
  });
});
