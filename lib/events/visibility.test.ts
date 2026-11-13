import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));

import { eventVisibility } from "./visibility";

describe("eventVisibility", () => {
  it.each(["Admin", "User"] as const)(
    "does not restrict %s event reads",
    (role) => {
      expect(eventVisibility({ id: 2, role })).toBeUndefined();
    },
  );

  it("restricts Readers to non-hidden events and their current icon scope", () => {
    const predicate = eventVisibility({ id: 3, role: "Reader" });
    if (!predicate) throw new Error("Missing Reader visibility predicate");

    const query = new PgDialect().sqlToQuery(predicate);
    expect(query.sql).toContain('"events"."hidden" = $1');
    expect(query.sql).toContain('"users"."reader_all_icons" = true');
    expect(query.sql).toContain('"reader_icon_permissions"."user_id" = $');
    expect(query.sql).toContain(
      '"reader_icon_permissions"."icon_id" = "events"."icon_id"',
    );
    expect(query.params).toEqual([false, 3, 3]);
  });
});
