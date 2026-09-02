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
vi.mock("next/image", () => ({
  default: () => null,
}));
vi.mock("@/components/UserAvatar/UserAvatar", () => ({
  UserAvatar: () => null,
}));
vi.mock("./EventActions", () => ({
  EventActions: () => null,
}));

import EventPage from "./page";

describe("EventPage", () => {
  it("authenticates before loading event details", async () => {
    mocks.requirePageSession.mockRejectedValue(new Error("NEXT_REDIRECT"));
    mocks.select.mockReturnValue({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      })),
    });

    await expect(
      EventPage({ params: Promise.resolve({ id: "12" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.select).not.toHaveBeenCalled();
  });
});
