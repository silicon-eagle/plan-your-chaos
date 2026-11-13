import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  hashPassword: vi.fn(),
}));
vi.mock("@/db/client", () => ({ db: mocks }));
vi.mock("./passwords", () => ({ hashPassword: mocks.hashPassword }));

import {
  AdminValidationError,
  createManagedUser,
  deleteManagedUser,
  getManagedUser,
  issueTemporaryPassword,
  resetTotp,
  updateManagedUser,
} from "./admin-service";
import { users } from "@/db/schema";

let target: { id: number; name: string; roleId: number } | undefined;
let written: Record<string, unknown>[];
const lock = vi.fn();
const writeWhere = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  target = { id: 2, name: "Tim", roleId: 2 };
  written = [];
  mocks.transaction.mockImplementation(async (callback) => callback(mocks));
  mocks.hashPassword.mockResolvedValue("hashed-temporary-password");
  mocks.execute.mockResolvedValue(undefined);
  lock.mockImplementation(() => ({ limit: async () => target ? [target] : [] }));
  mocks.select.mockImplementation(() => ({
    from: () => ({ where: () => ({
      for: lock,
      limit: async () => target ? [{ ...target }] : [],
    }) }),
  }));
  mocks.insert.mockReturnValue({
    values: (value: Record<string, unknown>) => {
      written.push(value);
      return { returning: async () => [{ id: 3, name: value.name }] };
    },
  });
  writeWhere.mockReturnValue({ returning: async () => [{ id: target?.id }] });
  mocks.update.mockReturnValue({
    set: (value: Record<string, unknown>) => {
      written.push(value);
      return { where: writeWhere };
    },
  });
  mocks.delete.mockReturnValue({ where: writeWhere });
});

describe("managed accounts", () => {
  it.each([true, false])("loads a single account by ID (exists: %s)", async (exists) => {
    const account = {
      id: 2, name: "Tim", role: "User", hasPassword: true,
      mustSetPassword: false, hasTotp: false,
    };
    const where = vi.fn().mockReturnValue({
      limit: async () => exists ? [account] : [],
    });
    mocks.select.mockReturnValueOnce({
      from: () => ({ innerJoin: () => ({ where }) }),
    });
    expect(await getManagedUser(2)).toEqual(exists ? account : undefined);
    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.sql).toBe('"users"."id" = $1');
    expect(query.params).toEqual([2]);
  });

  it("accepts deletion confirmation regardless of letter case", async () => {
    await deleteManagedUser(2, "tIM");
    expect(mocks.delete).toHaveBeenCalledWith(users);
  });

  it("reports case-insensitive name conflicts on create and rename", async () => {
    mocks.transaction.mockRejectedValue({
      cause: { code: "23505", constraint: "users_name_case_insensitive_unique" },
    });
    await expect(createManagedUser("TIM", "Reader")).rejects.toThrow(
      "A user with that name already exists",
    );
    await expect(updateManagedUser(2, "ADMIN", "Reader")).rejects.toThrow(
      "A user with that name already exists",
    );
  });

  it("creates a Reader with a generated temporary password, never storing plaintext", async () => {
    const result = await createManagedUser(" Alice ", "Reader");
    expect(result.temporaryPassword).toMatch(/^[a-zA-Z0-9_-]{32}$/);
    expect(mocks.hashPassword).toHaveBeenCalledWith(result.temporaryPassword);
    expect(written).toEqual([{
      name: "Alice", roleId: 3, passwordHash: "hashed-temporary-password",
      mustSetPassword: true,
    }]);
  });

  it.each(["Admin", "unknown", ""])("cannot create a %s role", async (role) => {
    await expect(createManagedUser("Alice", role)).rejects.toThrow(AdminValidationError);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it.each(["", "   ", "a".repeat(81)])("rejects invalid names", async (name) => {
    await expect(createManagedUser(name, "User")).rejects.toThrow(AdminValidationError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("changes a non-admin name and role together under a row lock", async () => {
    await updateManagedUser(2, "New name", "Reader");
    expect(lock).toHaveBeenCalledWith("update");
    expect(written).toEqual([{ name: "New name", roleId: 3 }]);
    expect(mocks.update).toHaveBeenCalledWith(users);
  });

  it("cannot promote a user to Admin", async () => {
    await expect(updateManagedUser(2, "Tim", "Admin")).rejects.toThrow(AdminValidationError);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("checks the locked database role rather than a stale UI role before demotion", async () => {
    target = { id: 2, name: "Tim", roleId: 1 };
    await expect(updateManagedUser(2, "Tim", "Reader")).rejects.toThrow("Admin accounts");
    expect(lock).toHaveBeenCalledWith("update");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("cannot delete an Admin even with the correct confirmation", async () => {
    target = { id: 1, name: "Admin", roleId: 1 };
    await expect(deleteManagedUser(1, "Admin")).rejects.toThrow("Admin accounts");
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("cannot bypass Admin protection by demoting then deleting", async () => {
    target = { id: 1, name: "Admin", roleId: 1 };
    const results = await Promise.allSettled([
      updateManagedUser(1, "Ordinary", "User"),
      deleteManagedUser(1, "Admin"),
    ]);
    expect(results.map((result) => result.status)).toEqual(["rejected", "rejected"]);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("requires the current account name as explicit deletion confirmation", async () => {
    await expect(deleteManagedUser(2, "Old name")).rejects.toThrow("confirmation");
    expect(mocks.delete).not.toHaveBeenCalled();
    await deleteManagedUser(2, "Tim");
    expect(mocks.delete).toHaveBeenCalledWith(users);
    expect(lock).toHaveBeenCalledWith("update");
  });

  it("rejects a missing account without writing", async () => {
    target = undefined;
    await expect(updateManagedUser(2, "New name", "Reader")).rejects.toThrow("User not found");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("reports name conflicts but propagates infrastructure failures", async () => {
    mocks.transaction.mockRejectedValueOnce({
      cause: { code: "23505", constraint: "users_name_case_insensitive_unique" },
    });
    await expect(createManagedUser("Tim", "Reader")).rejects.toThrow(
      "A user with that name already exists",
    );
    const unavailable = new Error("Database unavailable");
    mocks.transaction.mockRejectedValueOnce(unavailable);
    await expect(createManagedUser("Other", "User")).rejects.toBe(unavailable);
  });
});

describe.each([
  ["password issuance", issueTemporaryPassword],
  ["TOTP reset", resetTotp],
] as const)("%s lock ordering", (_label, reset) => {
  it("accepts case-insensitive CLI targets after acquiring locks", async () => {
    const predicates: SQL[] = [];
    mocks.select.mockImplementation(() => ({
      from: () => ({
        where: (predicate: SQL) => {
          predicates.push(predicate);
          return {
            for: lock,
            limit: async () => target ? [{ ...target }] : [],
          };
        },
      }),
    }));
    await reset("tIM");
    const query = new PgDialect().sqlToQuery(predicates[0]);
    expect(query.sql).toBe('lower("users"."name") = lower($1)');
    expect(query.params).toEqual(["tIM"]);
    expect(written).toHaveLength(3);
  });

  it.each([2, "Tim"])("waits for the advisory lock before taking the user row lock for %s", async (account) => {
    let release!: () => void;
    let acquired!: () => void;
    const waiting = new Promise<void>((resolve) => { acquired = resolve; });
    mocks.execute.mockImplementation(() => {
      acquired();
      return new Promise<void>((resolve) => { release = resolve; });
    });

    const operation = reset(account);
    await waiting;
    const locksBeforeAdvisoryAcquisition = lock.mock.calls.length;
    release();
    await operation;

    expect(locksBeforeAdvisoryAcquisition).toBe(0);
    expect(lock).toHaveBeenCalledWith("update");
    expect(written).toHaveLength(3);
  });

  it("rejects a CLI target renamed while waiting for the advisory lock", async () => {
    mocks.execute.mockImplementation(async () => {
      target = { id: 2, name: "Renamed", roleId: 2 };
    });

    await expect(reset("Tim")).rejects.toThrow("User not found: Tim");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not switch to a different account reusing the original CLI name", async () => {
    const accounts = [{ id: 2, name: "Tim", roleId: 2 }];
    mocks.select.mockImplementation(() => ({
      from: () => ({
        where: (predicate: SQL) => {
          const [identity] = new PgDialect().sqlToQuery(predicate).params;
          const limit = async () => accounts
            .filter((user) => typeof identity === "number" ? user.id === identity : user.name === identity)
            .map((user) => ({ ...user }));
          return { limit, for: () => ({ limit }) };
        },
      }),
    }));
    mocks.execute.mockImplementation(async () => {
      accounts[0].name = "Renamed";
      accounts.push({ id: 3, name: "Tim", roleId: 2 });
    });

    await expect(reset("Tim")).rejects.toThrow("User not found: Tim");
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
