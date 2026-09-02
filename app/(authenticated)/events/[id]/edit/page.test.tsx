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
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/components/EventForm/EventForm", () => ({
  EventForm: () => <form aria-label="Event form" />,
}));
vi.mock("@/lib/events/icons", () => ({
  chooseRandomIcon: () => ({ id: 1 }),
}));
vi.mock("./actions", () => ({
  updateEvent: vi.fn(),
}));

import EditEventPage from "./page";

describe("EditEventPage", () => {
  it("authenticates before loading editable event data", async () => {
    mocks.requirePageSession.mockRejectedValue(new Error("NEXT_REDIRECT"));
    mocks.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    });

    await expect(
      EditEventPage({ params: Promise.resolve({ id: "12" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.select).not.toHaveBeenCalled();
  });
});
