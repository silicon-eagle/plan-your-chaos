import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

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

import { getEventsInRange } from "./queries";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getEventsInRange", () => {
  it.each(["Reader", "User", "Admin"])("filters hidden events at the database for %s", async (role) => {
    mocks.requireSession.mockResolvedValue({ user: { id: 1, role } });
    const where = vi.fn<(condition: SQL | undefined) => unknown>()
      .mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) });
    mocks.select.mockReturnValue({ from: vi.fn(() => ({ where })) });
    await getEventsInRange(new Date("2026-07-01"), new Date("2026-08-01"));
    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]!);
    if (role === "Reader") {
      expect(query.sql).toContain('"events"."hidden"');
      expect(query.params).toContain(false);
    } else {
      expect(query.sql).not.toContain('"hidden"');
    }
  });

  it("rejects without any DB operation when unauthenticated", async () => {
    mocks.requireSession.mockRejectedValue(new Error("Authentication required"));

    await expect(
      getEventsInRange(new Date("2026-07-01"), new Date("2026-08-01")),
    ).rejects.toThrow("Authentication required");

    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("returns an empty array when no events fall in the range", async () => {
    mocks.requireSession.mockResolvedValue({ user: { id: 1 } });
    mocks.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const result = await getEventsInRange(
      new Date("2026-07-01"),
      new Date("2026-08-01"),
    );

    expect(result).toEqual([]);
    expect(mocks.select).toHaveBeenCalledOnce();
  });
});
