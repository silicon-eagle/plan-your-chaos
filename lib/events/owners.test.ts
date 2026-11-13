import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({ select: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));

import { isEventOwner } from "./owners";

beforeEach(() => vi.clearAllMocks());

describe("eligible event owners", () => {
  it.each([null, "", 0, -1, 1.5, "invalid"])("rejects malformed owner %s without querying", async (owner) => {
    expect(await isEventOwner(owner)).toBe(false);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("only accepts an existing User role account", async () => {
    const where = vi.fn<(condition: SQL | undefined) => unknown>().mockReturnValue({
      limit: vi.fn().mockResolvedValue([{ id: 2 }]),
    });
    mocks.select.mockReturnValue({ from: vi.fn(() => ({ where })) });
    expect(await isEventOwner(2)).toBe(true);
    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]!);
    expect(query.sql).toContain('"users"."role_id"');
    expect(query.params).toEqual([2, 2]);
  });

  it("rejects missing or non-User accounts", async () => {
    mocks.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
      })),
    });
    expect(await isEventOwner(3)).toBe(false);
  });
});
