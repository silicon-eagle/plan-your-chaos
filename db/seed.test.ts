import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  hashPassword: vi.fn(),
}));
vi.mock("dotenv/config", () => ({}));
vi.mock("./client", () => ({ db: mocks, closeDatabase: vi.fn() }));
vi.mock("../lib/auth/passwords", () => ({ hashPassword: mocks.hashPassword }));

import { seed } from "./seed";
import { icons, seedInitializations, users } from "./schema";

const inserted: Array<{ table: unknown; values: Record<string, unknown> }> = [];
let rows: unknown[][] = [];
let predicates: SQL[] = [];

afterEach(() => vi.unstubAllEnvs());

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("INIT_ADMIN_PASSWORD", "initial-admin-password");
  inserted.length = 0;
  rows = [];
  predicates = [];
  mocks.transaction.mockImplementation(async (callback) => callback(mocks));
  mocks.execute.mockResolvedValue(undefined);
  mocks.hashPassword.mockResolvedValue("hashed-initial-password");
  mocks.select.mockImplementation(() => ({
    from: () => ({
      where: (predicate: SQL) => {
        predicates.push(predicate);
        return { limit: async () => rows.shift() ?? [] };
      },
    }),
  }));
  mocks.insert.mockImplementation((table) => ({
    values: (values: Record<string, unknown>) => {
      inserted.push({ table, values });
      return Object.assign(Promise.resolve(), { onConflictDoUpdate: async () => {} });
    },
  }));
  mocks.update.mockReturnValue({ set: () => ({ where: async () => {} }) });
});

describe("initial account seeding", () => {
  it("creates only the initial Admin with a hash and forced password replacement", async () => {
    await seed();
    expect(inserted.filter((entry) => entry.table === users).map((entry) => entry.values))
      .toEqual([{
        name: "Admin",
        roleId: 1,
        passwordHash: "hashed-initial-password",
        mustSetPassword: true,
      }]);
    expect(mocks.hashPassword).toHaveBeenCalledWith("initial-admin-password");
  });

  it("fails explicitly if the first Admin needs a password", async () => {
    vi.stubEnv("INIT_ADMIN_PASSWORD", "");
    await expect(seed()).rejects.toThrow("INIT_ADMIN_PASSWORD");
    expect(inserted.filter((entry) => entry.table === users)).toEqual([]);
  });

  it("never resets or recreates accounts after bootstrap, even without the password", async () => {
    rows = [[{ key: "initial-admin" }]];
    vi.stubEnv("INIT_ADMIN_PASSWORD", "");
    await seed();
    expect(inserted.filter((entry) => entry.table === users)).toEqual([]);
    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(mocks.update.mock.calls.some(([table]) => table === users)).toBe(false);
  });

  it("preserves an existing renamed Admin and its credentials", async () => {
    rows = [[], [{ id: 8, name: "Household owner", roleId: 1 }]];
    vi.stubEnv("INIT_ADMIN_PASSWORD", "");
    await seed();
    expect(inserted.filter((entry) => entry.table === users)).toEqual([]);
    expect(mocks.hashPassword).not.toHaveBeenCalled();
  });

  it("refuses to promote an ordinary account named admin regardless of case", async () => {
    rows = [[], [], [{ id: 2, name: "admin", roleId: 2 }]];
    await expect(seed()).rejects.toThrow("already belongs to a non-admin");
    expect(inserted.filter((entry) => entry.table === users)).toEqual([]);
    const query = new PgDialect().sqlToQuery(predicates[2]);
    expect(query.sql).toBe('lower("users"."name") = lower($1)');
    expect(query.params).toEqual(["Admin"]);
  });

  it("seeds all 21 icon choices without touching user roles", async () => {
    rows = [[{ key: "initial-admin" }]];
    await seed();
    const iconNames = inserted.filter((entry) => entry.table === icons)
      .map((entry) => entry.values.fileName);
    expect(iconNames).toHaveLength(21);
    expect(iconNames).toEqual(expect.arrayContaining([
      "chess", "cocktail", "controller", "helmet", "plane", "sword",
    ]));
  });

  it("uses the successful bootstrap marker on a subsequent seed run", async () => {
    await seed();
    const marker = inserted.find((entry) => entry.table === seedInitializations)?.values;
    expect(marker).toBeDefined();
    const existingIcons = inserted.filter((entry) => entry.table === icons);
    inserted.length = 0;
    rows = [[marker], ...existingIcons.map((_, index) => [{ id: index + 1 }])];
    vi.stubEnv("INIT_ADMIN_PASSWORD", "changed-but-must-not-be-used");

    await seed();

    expect(inserted).toEqual([]);
    expect(mocks.hashPassword).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledTimes(21);
    expect(mocks.update.mock.calls.every(([table]) => table === icons)).toBe(true);
  });

  it("waits for the deployment lock before inspecting bootstrap state", async () => {
    let unlock!: () => void;
    mocks.execute.mockReturnValue(new Promise<void>((resolve) => { unlock = resolve; }));
    const pending = seed();
    expect(mocks.select).not.toHaveBeenCalled();
    unlock();
    await pending;
    expect(inserted.filter((entry) => entry.table === users)).toHaveLength(1);
  });
});
