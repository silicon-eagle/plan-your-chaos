import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
  EventListClient: ({ showCreateButton }: { showCreateButton: boolean }) => (
    <div>{showCreateButton ? "Can create" : "Read only"}</div>
  ),
}));

import { EventList } from "./EventList";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EventList", () => {
  it.each(["Reader", "User", "Admin"])("gates the create control for %s", async (role) => {
    mocks.select.mockClear();
    mocks.requireSession.mockResolvedValue({ user: { id: 1, role } });
    mocks.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([]) })),
      })),
    });
    render(await EventList({
      from: new Date("2026-08-01"), to: new Date("2026-09-01"),
      showCreateButton: true, showFilters: false,
    }));
    expect(screen.getByText(role === "User" ? "Can create" : "Read only")).toBeInTheDocument();
    mocks.select.mockClear();
  });

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
