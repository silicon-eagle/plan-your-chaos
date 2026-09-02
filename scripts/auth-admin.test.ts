import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv/config", () => ({}));

// ── Mock: database client ─────────────────────────────────────────────────

const txMocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
}));

const loggerMocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  db: dbMocks,
  closeDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/passwords", () => ({
  hashPassword: vi.fn().mockResolvedValue("argon2id-hash"),
}));

vi.mock("@/lib/logging/logger", () => ({
  logger: loggerMocks,
}));

import { hashPassword } from "@/lib/auth/passwords";
import {
  cleanupAuthRecords,
  issueTemporaryPassword,
  main,
  resetTotp,
} from "./auth-admin";

// ── Mock chain helpers ────────────────────────────────────────────────────

function selectReturning(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn(() => ({ limit }));
  return { from: vi.fn(() => ({ where })) };
}

function txUpdateChain(captured: Array<Record<string, unknown>>) {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn((values: Record<string, unknown>) => {
    captured.push(values);
    return { where };
  });
  return { set };
}

function deleteChain(returning: unknown[]) {
  const returningFn = vi.fn().mockResolvedValue(returning);
  const where = vi.fn(() => ({ returning: returningFn }));
  return { where };
}

function setupSuccessfulCommandTransaction(
  capturedSets: Array<Record<string, unknown>> = [],
) {
  txMocks.select.mockReturnValue(selectReturning([testUser]));
  txMocks.update.mockReturnValue(txUpdateChain(capturedSets));
  dbMocks.transaction.mockImplementation(
    async (cb: (tx: unknown) => Promise<void>) => {
      return cb(txMocks);
    },
  );
}

// ── Fixtures ──────────────────────────────────────────────────────────────

const testUser = { id: 42 };
const baseNow = new Date("2026-08-28T12:00:00.000Z");
const originalArgv = [...process.argv];

beforeEach(() => {
  vi.clearAllMocks();
  process.argv = [...originalArgv];
  process.exitCode = undefined;
  (hashPassword as ReturnType<typeof vi.fn>).mockResolvedValue("argon2id-hash");
});

// ── issueTemporaryPassword ────────────────────────────────────────────────

describe("issueTemporaryPassword", () => {
  function setupTransaction(capturedSets: Array<Record<string, unknown>>) {
    txMocks.select.mockReturnValue(selectReturning([testUser]));
    txMocks.update.mockReturnValue(txUpdateChain(capturedSets));
    dbMocks.transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<void>) => {
        return cb(txMocks);
      },
    );
  }

  it("returns a temporary password of at least 20 base64url characters", async () => {
    setupTransaction([]);
    const password = await issueTemporaryPassword("Alice");
    expect(password.length).toBeGreaterThanOrEqual(20);
    expect(password).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("stores an Argon2id hash, not the plaintext password", async () => {
    const capturedSets: Array<Record<string, unknown>> = [];
    setupTransaction(capturedSets);

    const password = await issueTemporaryPassword("Alice");

    expect(hashPassword).toHaveBeenCalledWith(password);
    const userUpdate = capturedSets.find((s) => "passwordHash" in s);
    expect(userUpdate?.passwordHash).toBe("argon2id-hash");
    expect(userUpdate?.passwordHash).not.toBe(password);
  });

  it("does not log the generated temporary password", async () => {
    setupTransaction([]);

    const password = await issueTemporaryPassword("Alice");

    expect(loggerMocks.info).toHaveBeenCalledWith(
      "auth.admin.issued-temporary-password",
      { userName: "Alice" },
    );
    expect(
      JSON.stringify([
        loggerMocks.info.mock.calls,
        loggerMocks.warn.mock.calls,
        loggerMocks.error.mock.calls,
      ]),
    ).not.toContain(password);
  });

  it("sets mustSetPassword to true", async () => {
    const capturedSets: Array<Record<string, unknown>> = [];
    setupTransaction(capturedSets);

    await issueTemporaryPassword("Alice");

    const userUpdate = capturedSets.find((s) => "mustSetPassword" in s);
    expect(userUpdate?.mustSetPassword).toBe(true);
  });

  it("clears lockout state", async () => {
    const capturedSets: Array<Record<string, unknown>> = [];
    setupTransaction(capturedSets);

    await issueTemporaryPassword("Alice");

    const userUpdate = capturedSets.find((s) => "failedLoginCount" in s);
    expect(userUpdate?.failedLoginCount).toBe(0);
    expect(userUpdate?.lockedUntil).toBeNull();
  });

  it("revokes all sessions inside the transaction", async () => {
    const capturedSets: Array<Record<string, unknown>> = [];
    setupTransaction(capturedSets);

    await issueTemporaryPassword("Alice");

    const sessionUpdate = capturedSets.find((s) => "revocationReason" in s);
    expect(sessionUpdate?.revokedAt).toBeInstanceOf(Date);
    expect(sessionUpdate?.revocationReason).toBe("admin:issue-password");
  });

  it("invalidates open challenges inside the transaction", async () => {
    const capturedSets: Array<Record<string, unknown>> = [];
    setupTransaction(capturedSets);

    await issueTemporaryPassword("Alice");

    const challengeUpdate = capturedSets.find(
      (s) => "consumedAt" in s && !("revocationReason" in s),
    );
    expect(challengeUpdate?.consumedAt).toBeInstanceOf(Date);
  });

  it("performs all three writes in a single transaction", async () => {
    setupTransaction([]);
    await issueTemporaryPassword("Alice");
    expect(dbMocks.transaction).toHaveBeenCalledOnce();
    expect(txMocks.update).toHaveBeenCalledTimes(3);
  });

  it("throws for an unknown user", async () => {
    txMocks.select.mockReturnValue(selectReturning([]));
    await expect(issueTemporaryPassword("Unknown")).rejects.toThrow(
      "User not found: Unknown",
    );
    expect(dbMocks.transaction).toHaveBeenCalledOnce();
    expect(txMocks.update).not.toHaveBeenCalled();
  });
});

// ── resetTotp ─────────────────────────────────────────────────────────────

describe("resetTotp", () => {
  function setupTransaction(capturedSets: Array<Record<string, unknown>>) {
    txMocks.select.mockReturnValue(selectReturning([testUser]));
    txMocks.update.mockReturnValue(txUpdateChain(capturedSets));
    dbMocks.transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<void>) => {
        return cb(txMocks);
      },
    );
  }

  it("clears all three TOTP fields", async () => {
    const capturedSets: Array<Record<string, unknown>> = [];
    setupTransaction(capturedSets);

    await resetTotp("Alice");

    const totpUpdate = capturedSets.find((s) => "totpSecretEncrypted" in s);
    expect(totpUpdate?.totpSecretEncrypted).toBeNull();
    expect(totpUpdate?.totpEnabledAt).toBeNull();
    expect(totpUpdate?.lastTotpCounter).toBeNull();
  });

  it("does not alter passwordHash or mustSetPassword", async () => {
    const capturedSets: Array<Record<string, unknown>> = [];
    setupTransaction(capturedSets);

    await resetTotp("Alice");

    for (const update of capturedSets) {
      expect(update).not.toHaveProperty("passwordHash");
      expect(update).not.toHaveProperty("mustSetPassword");
    }
  });

  it("revokes all sessions inside the transaction", async () => {
    const capturedSets: Array<Record<string, unknown>> = [];
    setupTransaction(capturedSets);

    await resetTotp("Alice");

    const sessionUpdate = capturedSets.find((s) => "revocationReason" in s);
    expect(sessionUpdate?.revokedAt).toBeInstanceOf(Date);
    expect(sessionUpdate?.revocationReason).toBe("admin:reset-totp");
  });

  it("invalidates open challenges inside the transaction", async () => {
    const capturedSets: Array<Record<string, unknown>> = [];
    setupTransaction(capturedSets);

    await resetTotp("Alice");

    const challengeUpdate = capturedSets.find(
      (s) => "consumedAt" in s && !("revocationReason" in s),
    );
    expect(challengeUpdate?.consumedAt).toBeInstanceOf(Date);
  });

  it("performs all three writes in a single transaction", async () => {
    setupTransaction([]);
    await resetTotp("Alice");
    expect(dbMocks.transaction).toHaveBeenCalledOnce();
    expect(txMocks.update).toHaveBeenCalledTimes(3);
  });

  it("throws for an unknown user", async () => {
    txMocks.select.mockReturnValue(selectReturning([]));
    await expect(resetTotp("Unknown")).rejects.toThrow("User not found: Unknown");
    expect(dbMocks.transaction).toHaveBeenCalledOnce();
    expect(txMocks.update).not.toHaveBeenCalled();
  });
});

// ── cleanupAuthRecords ────────────────────────────────────────────────────

describe("cleanupAuthRecords", () => {
  it("returns counts of deleted sessions and challenges", async () => {
    dbMocks.delete
      .mockReturnValueOnce(deleteChain([{ id: 1 }, { id: 2 }, { id: 3 }]))
      .mockReturnValueOnce(deleteChain([{ id: 10 }]));

    const result = await cleanupAuthRecords(baseNow);

    expect(result).toEqual({ sessionsDeleted: 3, challengesDeleted: 1 });
  });

  it("returns zero counts when nothing needs cleanup", async () => {
    dbMocks.delete
      .mockReturnValueOnce(deleteChain([]))
      .mockReturnValueOnce(deleteChain([]));

    const result = await cleanupAuthRecords(baseNow);

    expect(result).toEqual({ sessionsDeleted: 0, challengesDeleted: 0 });
  });

  it("deletes sessions and challenges in two separate operations", async () => {
    dbMocks.delete
      .mockReturnValueOnce(deleteChain([]))
      .mockReturnValueOnce(deleteChain([]));

    await cleanupAuthRecords(baseNow);

    expect(dbMocks.delete).toHaveBeenCalledTimes(2);
  });
});

// ── main ──────────────────────────────────────────────────────────────────

describe("main", () => {
  const acceptedCommandCases = [
    {
      command: "issue-password",
      args: ["--user", "Alice"],
      expectedInfo: "Temporary password for Alice:",
    },
    {
      command: "reset-totp",
      args: ["--user", "Alice"],
      expectedInfo: undefined,
    },
  ] as const;

  const rejectedCommandCases = [
    {
      command: "issue-password",
      args: [],
    },
    {
      command: "issue-password",
      args: ["--user"],
    },
    {
      command: "issue-password",
      args: ["--user", ""],
    },
    {
      command: "issue-password",
      args: ["--user", "--user"],
    },
    {
      command: "issue-password",
      args: ["--user", "Alice", "extra"],
    },
    {
      command: "issue-password",
      args: ["--verbose", "--user", "Alice"],
    },
    {
      command: "issue-password",
      args: ["Alice", "--user"],
    },
    {
      command: "reset-totp",
      args: ["--user"],
    },
    {
      command: "reset-totp",
      args: ["--user", ""],
    },
    {
      command: "reset-totp",
      args: ["--user", "--user"],
    },
    {
      command: "reset-totp",
      args: ["--user", "Alice", "--verbose"],
    },
    {
      command: "reset-totp",
      args: ["--verbose", "--user", "Alice"],
    },
    {
      command: "reset-totp",
      args: ["Alice", "--user"],
    },
  ] as const;

  it.each(acceptedCommandCases)(
    "accepts exactly %s --user <name>",
    async ({ command, args, expectedInfo }) => {
      setupSuccessfulCommandTransaction([]);
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      process.argv = [originalArgv[0], originalArgv[1], command, ...args];

      await main();

      expect(process.exitCode).toBeUndefined();
      expect(dbMocks.transaction).toHaveBeenCalledOnce();
      expect(errorSpy).not.toHaveBeenCalled();
      if (expectedInfo) {
        expect(infoSpy).toHaveBeenCalledWith(
          expect.stringMatching(new RegExp(`^${expectedInfo} `)),
        );
      }

      errorSpy.mockRestore();
      infoSpy.mockRestore();
    },
  );

  it.each(rejectedCommandCases)(
    "rejects malformed %s argv %j",
    async ({ command, args }) => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      process.argv = [originalArgv[0], originalArgv[1], command, ...args];

      await main();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("requires exactly: --user <name>"),
      );
      expect(process.exitCode).toBe(1);
      expect(dbMocks.transaction).not.toHaveBeenCalled();

      errorSpy.mockRestore();
    },
  );

  it("rejects extra cleanup arguments and exits with a failure code", async () => {
    process.argv = [
      originalArgv[0],
      originalArgv[1],
      "cleanup",
      "unexpected",
    ];
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await main();

    expect(errorSpy).toHaveBeenCalledWith(
      "Error: cleanup does not accept extra arguments",
    );
    expect(process.exitCode).toBe(1);
    expect(dbMocks.transaction).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
