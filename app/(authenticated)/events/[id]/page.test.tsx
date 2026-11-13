import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

vi.mock("server-only", () => ({}));

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
  it("filters both adjacent-event links for Readers", async () => {
    mocks.select.mockReset();
    mocks.requirePageSession.mockResolvedValue({ user: { id: 3, role: "Reader" } });
    const event = {
      id: 12, title: "Public event", startsAt: new Date("2026-07-24T18:00Z"),
      endsAt: new Date("2026-07-24T19:00Z"), allDay: false, hidden: false,
      notes: null, ownerName: "Tim", iconName: null, iconFileName: null,
    };
    const adjacentWhere = vi.fn<(condition: SQL | undefined) => unknown>().mockReturnValue({
      orderBy: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
    });
    mocks.select
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([event]) })),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([]) })),
          })),
        })),
      })
      .mockReturnValue({ from: vi.fn(() => ({ where: adjacentWhere })) });
    await EventPage({ params: Promise.resolve({ id: "12" }) });
    expect(adjacentWhere).toHaveBeenCalledTimes(2);
    for (const [condition] of adjacentWhere.mock.calls) {
      const query = new PgDialect().sqlToQuery(condition!);
      expect(query.sql).toContain('"events"."hidden"');
      expect(query.params).toContain(false);
    }
    mocks.select.mockClear();
  });

  it("returns not-found for a hidden event requested by a Reader", async () => {
    mocks.select.mockClear();
    mocks.requirePageSession.mockResolvedValue({ user: { id: 3, role: "Reader" } });
    const where = vi.fn<(condition: SQL | undefined) => unknown>().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    });
    mocks.select.mockReturnValue({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({ where })),
        })),
      })),
    });
    await expect(EventPage({ params: Promise.resolve({ id: "12" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]!);
    expect(query.sql).toContain('"events"."hidden"');
    expect(query.params).toEqual([12, false]);
    expect(mocks.select).toHaveBeenCalledOnce();
    mocks.select.mockClear();
  });

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
