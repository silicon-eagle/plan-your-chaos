import { describe, expect, it } from "vitest";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { SQL } from "drizzle-orm";
import * as schema from "./schema";

describe("role and event schema", () => {
  it("enforces unique usernames regardless of letter case", () => {
    const index = getTableConfig(schema.users).indexes.find(
      ({ config }) => config.name === "users_name_case_insensitive_unique",
    );
    expect(index?.config.unique).toBe(true);
    const column = index?.config.columns[0];
    expect(column).toBeInstanceOf(SQL);
    if (!(column instanceof SQL)) throw new Error("Missing case-insensitive username index");
    expect(new PgDialect().sqlToQuery(column).sql).toBe('lower("users"."name")');
  });

  it("replaces avatars with a required User-default role foreign key", () => {
    expect(schema.users).not.toHaveProperty("avatarPath");
    expect(schema.users).toHaveProperty("roleId");
    expect(schema.users.roleId.default).toBe(2);
    expect(schema.users.roleId.notNull).toBe(true);
    expect(getTableConfig(schema.users).foreignKeys.some(
      (key) => key.reference().foreignTable === schema.userRoles,
    )).toBe(true);
  });

  it("makes existing and new events visible by default", () => {
    expect(schema.events).toHaveProperty("hidden");
    expect(schema.events.hidden.default).toBe(false);
    expect(schema.events.hidden.notNull).toBe(true);
  });
});
