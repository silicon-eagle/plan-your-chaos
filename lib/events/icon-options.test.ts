import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));

import { getVisibleIconOptions } from "./icon-options";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getVisibleIconOptions", () => {
  it("returns all icons for Users without a permission predicate", async () => {
    const orderBy = vi.fn().mockResolvedValue([]);
    const where = vi.fn();
    mocks.select.mockReturnValue({
      from: () => ({ orderBy, where }),
    });

    await getVisibleIconOptions({ id: 2, role: "User" });

    expect(orderBy).toHaveBeenCalledOnce();
    expect(where).not.toHaveBeenCalled();
  });

  it("filters Reader options by the current All-or-selected scope", async () => {
    const where = vi.fn<(condition: SQL) => unknown>().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue([]),
    });
    mocks.select.mockReturnValue({
      from: () => ({ where }),
    });

    await getVisibleIconOptions({ id: 3, role: "Reader" });

    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.sql).toContain('"users"."reader_all_icons" = true');
    expect(query.sql).toContain('"reader_icon_permissions"."user_id"');
    expect(query.sql).toContain(
      '"reader_icon_permissions"."icon_id" = "icons"."id"',
    );
    expect(query.params).toEqual([3, 3]);
  });
});
