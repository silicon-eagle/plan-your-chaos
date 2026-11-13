import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { icons } from "@/db/schema";

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
import { EventList } from "./EventList";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EventList", () => {
  it("loads every registered icon for the enabled filter, even with no matching events", async () => {
    mocks.requireSession.mockResolvedValue({ user: { id: 2, role: "User" } });
    mocks.select.mockReturnValue({
      from: (table: unknown) => table === icons
        ? { orderBy: async () => [{ id: 7, name: "Unused icon" }] }
        : { where: () => ({ orderBy: async () => [] }) },
    });
    render(await EventList({
      from: new Date("2026-07-01"), to: new Date("2026-08-01"),
      showIconFilter: true,
    }));
    expect(screen.getByRole("combobox", { name: "Event icon" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Unused icon" })).toHaveValue("7");
  });

  it("excludes Admin from the attendant filter choices", async () => {
    mocks.requireSession.mockResolvedValue({ user: { id: 2, role: "User" } });
    const where = vi.fn<(condition: SQL) => unknown>().mockReturnValue({
      orderBy: async () => [],
    });
    mocks.select.mockReturnValue({
      from: () => ({ where, orderBy: async () => [] }),
    });
    await EventList({ from: new Date("2026-07-01"), to: new Date("2026-08-01") });
    const queries = where.mock.calls.map(([condition]) => new PgDialect().sqlToQuery(condition));
    expect(queries).toContainEqual(expect.objectContaining({
      sql: '"users"."role_id" <> $1',
      params: [1],
    }));
  });

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
    if (role === "User") {
      expect(screen.getByRole("link", { name: "Create event" })).toBeInTheDocument();
    } else {
      expect(screen.queryByRole("link", { name: "Create event" })).not.toBeInTheDocument();
    }
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
