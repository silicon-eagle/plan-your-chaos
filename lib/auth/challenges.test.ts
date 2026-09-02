import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  execute: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
}));

const cookieMocks = vi.hoisted(() => ({
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
  getSessionToken: vi.fn(),
  setChallengeCookie: vi.fn(),
  clearChallengeCookie: vi.fn(),
  getChallengeToken: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: dbMocks }));
vi.mock("./cookies", () => cookieMocks);

import {
  advanceChallenge,
  consumeChallenge,
  createChallenge,
  findValidChallenge,
  invalidateUserChallenges,
  storePendingTotpSecret,
} from "./challenges";
import { hashOpaqueToken } from "./tokens";

// ── Mock chain helpers ────────────────────────────────────────────────────

function selectReturning(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn(() => ({ limit }));
  return { from: vi.fn(() => ({ where })) };
}

function insertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

function updateChain(onSet?: (values: Record<string, unknown>) => void) {
  const returning = vi.fn().mockResolvedValue([{ id: 1 }]);
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn((values: Record<string, unknown>) => {
    onSet?.(values);
    return { where };
  });
  return { set };
}

function updateReturningChain(
  result: unknown[],
  onSet?: (values: Record<string, unknown>) => void,
) {
  const returning = vi.fn().mockResolvedValue(result);
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn((values: Record<string, unknown>) => {
    onSet?.(values);
    return { where };
  });
  return { set };
}

// ── Fixtures ──────────────────────────────────────────────────────────────

const baseNow = new Date("2026-08-28T12:00:00.000Z");
const tenMinutesMs = 10 * 60 * 1000;
const expiresAt = new Date(baseNow.getTime() + tenMinutesMs);
const validChallengeRow = {
  id: 1,
  userId: 2,
  stage: "set_password" as const,
  tokenHash: hashOpaqueToken("tok"),
  pendingPasswordHash: null,
  pendingTotpSecretEncrypted: null,
  expiresAt,
  consumedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.execute.mockResolvedValue(undefined);
  dbMocks.transaction.mockImplementation(async (fn: (tx: typeof dbMocks) => Promise<unknown>) => fn(dbMocks));
  cookieMocks.setChallengeCookie.mockResolvedValue(undefined);
  cookieMocks.clearChallengeCookie.mockResolvedValue(undefined);
});

// ── createChallenge ───────────────────────────────────────────────────────

describe("createChallenge", () => {
  beforeEach(() => {
    dbMocks.update.mockReturnValue(updateChain());
    dbMocks.insert.mockReturnValue(insertChain());
  });

  it("invalidates existing challenges before creating a new one", async () => {
    await createChallenge(1, "set_password", baseNow);
    expect(dbMocks.update).toHaveBeenCalledTimes(1);
  });

  it("serializes challenge creation for each user in a transaction", async () => {
    await createChallenge(1, "set_password", baseNow);

    expect(dbMocks.transaction).toHaveBeenCalledTimes(1);
    expect(dbMocks.execute).toHaveBeenCalledTimes(1);
    expect(
      dbMocks.execute.mock.invocationCallOrder[0],
    ).toBeLessThan(dbMocks.insert.mock.invocationCallOrder[0]);
  });

  it("inserts a challenge with hashed token and exact 10-minute expiry", async () => {
    await createChallenge(1, "set_password", baseNow);

    const insertResult = dbMocks.insert.mock.results[0].value;
    const row = insertResult.values.mock.calls[0][0];

    expect(row.userId).toBe(1);
    expect(row.stage).toBe("set_password");
    expect(row.tokenHash).toHaveLength(64);
    expect(row.expiresAt).toEqual(expiresAt);
    expect(row.expiresAt.getTime() - baseNow.getTime()).toBe(tenMinutesMs);
  });

  it("sets the challenge cookie with plaintext token matching the stored hash", async () => {
    await createChallenge(1, "set_password", baseNow);

    const cookieToken = cookieMocks.setChallengeCookie.mock.calls[0][0];
    const insertResult = dbMocks.insert.mock.results[0].value;
    const storedHash = insertResult.values.mock.calls[0][0].tokenHash;

    expect(hashOpaqueToken(cookieToken)).toBe(storedHash);
    expect(cookieMocks.setChallengeCookie).toHaveBeenCalledWith(
      expect.any(String),
      expiresAt,
    );
  });
});

// ── findValidChallenge ────────────────────────────────────────────────────

describe("findValidChallenge", () => {
  it("returns the challenge for a valid token and matching stage", async () => {
    dbMocks.select.mockReturnValue(selectReturning([validChallengeRow]));
    const result = await findValidChallenge("tok", "set_password", baseNow);
    expect(result).toEqual({
      id: 1,
      userId: 2,
      stage: "set_password",
      tokenHash: hashOpaqueToken("tok"),
      pendingPasswordHash: null,
      pendingTotpSecretEncrypted: null,
      expiresAt,
    });
  });

  it("returns null for an unknown token", async () => {
    dbMocks.select.mockReturnValue(selectReturning([]));
    expect(await findValidChallenge("x", "set_password", baseNow)).toBeNull();
  });

  it("returns null when stage does not match", async () => {
    dbMocks.select.mockReturnValue(
      selectReturning([{ ...validChallengeRow, stage: "enroll_totp" }]),
    );
    expect(await findValidChallenge("tok", "set_password", baseNow)).toBeNull();
  });

  it("returns null for a consumed challenge (single-use)", async () => {
    dbMocks.select.mockReturnValue(
      selectReturning([{ ...validChallengeRow, consumedAt: baseNow }]),
    );
    expect(await findValidChallenge("tok", "set_password", baseNow)).toBeNull();
  });

  it("returns null for an expired challenge (after 10 minutes)", async () => {
    dbMocks.select.mockReturnValue(selectReturning([validChallengeRow]));
    const afterExpiry = new Date(expiresAt.getTime() + 1);
    expect(
      await findValidChallenge("tok", "set_password", afterExpiry),
    ).toBeNull();
  });

  it("returns null when now exactly equals expiresAt", async () => {
    dbMocks.select.mockReturnValue(selectReturning([validChallengeRow]));
    expect(
      await findValidChallenge("tok", "set_password", expiresAt),
    ).toBeNull();
  });
});

// ── conditional challenge updates ─────────────────────────────────────────

describe("storePendingTotpSecret", () => {
  it("stores the encrypted secret only while the challenge is still valid", async () => {
    let setValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(
      updateReturningChain([{ id: 5 }], (v) => {
        setValues = v;
      }),
    );

    await expect(
      storePendingTotpSecret(
        { ...validChallengeRow, id: 5 },
        "v1.enc",
        baseNow,
      ),
    ).resolves.toBe(true);
    expect(setValues.pendingTotpSecretEncrypted).toBe("v1.enc");
  });

  it("reports when another request already changed the challenge", async () => {
    dbMocks.update.mockReturnValue(updateReturningChain([]));
    await expect(
      storePendingTotpSecret(validChallengeRow, "v1.enc", baseNow),
    ).resolves.toBe(false);
  });
});

describe("advanceChallenge", () => {
  it("rotates the token and stage only once", async () => {
    dbMocks.update.mockReturnValue(updateReturningChain([{ id: 1 }]));
    await expect(
      advanceChallenge(
        validChallengeRow,
        {
          tokenHash: hashOpaqueToken("next"),
          stage: "enroll_totp",
          expiresAt,
        },
        baseNow,
      ),
    ).resolves.toBe(true);
  });
});

describe("consumeChallenge", () => {
  it("clears pending setup state when consuming the challenge", async () => {
    let setValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(
      updateReturningChain([{ id: 1 }], (v) => {
        setValues = v;
      }),
    );

    await expect(
      consumeChallenge(
        {
          ...validChallengeRow,
          pendingPasswordHash: "$new-argon2-hash",
          pendingTotpSecretEncrypted: "v1.enc",
        },
        baseNow,
      ),
    ).resolves.toBe(true);

    expect(setValues.pendingPasswordHash).toBeNull();
    expect(setValues.pendingTotpSecretEncrypted).toBeNull();
    expect(setValues.consumedAt).toEqual(baseNow);
  });

  it("returns false when the challenge was already consumed", async () => {
    dbMocks.update.mockReturnValue(updateReturningChain([]));
    await expect(
      consumeChallenge(validChallengeRow, baseNow),
    ).resolves.toBe(false);
  });
});

// ── invalidateUserChallenges ──────────────────────────────────────────────

describe("invalidateUserChallenges", () => {
  it("marks all unconsumed challenges for the user as consumed", async () => {
    let setValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(
      updateChain((v) => {
        setValues = v;
      }),
    );

    await invalidateUserChallenges(2, baseNow);
    expect(dbMocks.update).toHaveBeenCalled();
    expect(setValues.consumedAt).toEqual(baseNow);
  });
});
