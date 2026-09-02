import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SQLWrapper } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

// ── Hoisted mocks ─────────────────────────────────────────────────────────

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
}));

const challengeMocks = vi.hoisted(() => ({
  createChallenge: vi.fn(),
  advanceChallenge: vi.fn(),
  consumeChallenge: vi.fn(),
  findValidChallenge: vi.fn(),
  invalidateUserChallenges: vi.fn(),
  storePendingTotpSecret: vi.fn(),
}));

const cookieMocks = vi.hoisted(() => ({
  getChallengeToken: vi.fn(),
  setChallengeCookie: vi.fn(),
  clearChallengeCookie: vi.fn(),
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
  getSessionToken: vi.fn(),
}));

const passwordMocks = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
  validateNewPassword: vi.fn(),
}));

const totpMocks = vi.hoisted(() => ({
  verifyTotpCode: vi.fn(),
  createTotpEnrollment: vi.fn(),
}));

const encryptionMocks = vi.hoisted(() => ({
  encryptTotpSecret: vi.fn(),
  decryptTotpSecret: vi.fn(),
}));

const sessionMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  findSessionByToken: vi.fn(),
  refreshSession: vi.fn(),
  revokeSessionByToken: vi.fn(),
  revokeAllUserSessions: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: dbMocks }));
vi.mock("./challenges", () => challengeMocks);
vi.mock("./cookies", () => cookieMocks);
vi.mock("./passwords", () => passwordMocks);
vi.mock("./totp", () => totpMocks);
vi.mock("./totp-encryption", () => encryptionMocks);
vi.mock("./sessions", () => sessionMocks);

import {
  beginLogin,
  beginTotpEnrollment,
  completePasswordSetup,
  completeTotpEnrollment,
} from "./login";
import { AUTH_LIMITS } from "./constants";

// ── Mock chain helpers ────────────────────────────────────────────────────

function selectReturning(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn(() => ({ limit }));
  return { from: vi.fn(() => ({ where })) };
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
  onWhere?: (condition: unknown) => void,
) {
  const returning = vi.fn().mockResolvedValue(result);
  const where = vi.fn((condition: unknown) => {
    onWhere?.(condition);
    return { returning };
  });
  const set = vi.fn((values: Record<string, unknown>) => {
    onSet?.(values);
    return { where };
  });
  return { set };
}

// ── Fixtures ──────────────────────────────────────────────────────────────

const baseNow = new Date("2026-08-28T12:00:00.000Z");

const userWithTotp = {
  id: 1,
  name: "Alice",
  passwordHash: "$argon2-hash",
  mustSetPassword: false,
  totpSecretEncrypted: "v1.encrypted",
  totpEnabledAt: new Date("2026-01-01"),
  lastTotpCounter: 100,
  failedLoginCount: 0,
  lockedUntil: null,
  avatarPath: null,
  createdAt: baseNow,
};

const userTempPasswordWithTotp = {
  ...userWithTotp,
  mustSetPassword: true,
};

const userTempPasswordNoTotp = {
  ...userWithTotp,
  mustSetPassword: true,
  totpSecretEncrypted: null,
  totpEnabledAt: null,
  lastTotpCounter: null,
};

const userNoTotp = {
  ...userWithTotp,
  mustSetPassword: false,
  totpSecretEncrypted: null,
  totpEnabledAt: null,
  lastTotpCounter: null,
};

const setPasswordChallenge = {
  id: 10,
  userId: 1,
  stage: "set_password" as const,
  tokenHash: "set-password-token-hash",
  pendingPasswordHash: null,
  pendingTotpSecretEncrypted: null,
  expiresAt: new Date(baseNow.getTime() + AUTH_LIMITS.challengeLifetimeMs),
};

const enrollChallenge = {
  id: 10,
  userId: 1,
  stage: "enroll_totp" as const,
  tokenHash: "enroll-token-hash",
  pendingPasswordHash: null,
  pendingTotpSecretEncrypted: "v1.pending-encrypted",
  expiresAt: new Date(baseNow.getTime() + AUTH_LIMITS.challengeLifetimeMs),
};

const enrollChallengeWithPendingPassword = {
  ...enrollChallenge,
  pendingPasswordHash: "$new-argon2-hash",
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.transaction.mockImplementation(async (fn: (tx: typeof dbMocks) => Promise<unknown>) => fn(dbMocks));
  challengeMocks.createChallenge.mockResolvedValue(undefined);
  challengeMocks.advanceChallenge.mockResolvedValue(true);
  challengeMocks.consumeChallenge.mockResolvedValue(true);
  challengeMocks.findValidChallenge.mockResolvedValue(null);
  challengeMocks.invalidateUserChallenges.mockResolvedValue(undefined);
  challengeMocks.storePendingTotpSecret.mockResolvedValue(true);
  cookieMocks.getChallengeToken.mockResolvedValue(undefined);
  cookieMocks.setChallengeCookie.mockResolvedValue(undefined);
  cookieMocks.clearChallengeCookie.mockResolvedValue(undefined);
  sessionMocks.createSession.mockResolvedValue({ id: 99 });
  passwordMocks.hashPassword.mockResolvedValue("$new-argon2-hash");
  passwordMocks.validateNewPassword.mockReturnValue(null);
  passwordMocks.verifyPassword.mockResolvedValue(false);
  encryptionMocks.decryptTotpSecret.mockReturnValue("JBSWY3DPEHPK3PXP");
  encryptionMocks.encryptTotpSecret.mockReturnValue("v1.new-encrypted");
  totpMocks.verifyTotpCode.mockReturnValue({ valid: true, counter: 200 });
  totpMocks.createTotpEnrollment.mockReturnValue({
    secret: "NEWSECRETBASE32",
    uri: "otpauth://totp/Plan%20Your%20Chaos:Alice?secret=NEWSECRETBASE32",
  });
});

// ── beginLogin ────────────────────────────────────────────────────────────

describe("beginLogin", () => {
  it("creates a session for valid password + TOTP", async () => {
    dbMocks.select.mockReturnValue(selectReturning([userWithTotp]));
    passwordMocks.verifyPassword.mockResolvedValue(true);
    dbMocks.update.mockReturnValue(updateChain());

    const result = await beginLogin(
      { userId: 1, password: "correct", totpCode: "123456" },
      baseNow,
    );

    expect(result).toEqual({ status: "authenticated" });
    expect(sessionMocks.createSession).toHaveBeenCalledWith(1, baseNow);
  });

  it("clears failure count and persists TOTP counter on successful login", async () => {
    const userWith3Failures = { ...userWithTotp, failedLoginCount: 3 };
    dbMocks.select.mockReturnValue(selectReturning([userWith3Failures]));
    passwordMocks.verifyPassword.mockResolvedValue(true);

    let setValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(updateChain((v) => { setValues = v; }));

    await beginLogin(
      { userId: 1, password: "correct", totpCode: "123456" },
      baseNow,
    );

    expect(setValues.failedLoginCount).toBe(0);
    expect(setValues.lockedUntil).toBeNull();
    expect(setValues.lastTotpCounter).toBe(200);
  });

  it("returns invalid for a missing user", async () => {
    dbMocks.select.mockReturnValue(selectReturning([]));

    const result = await beginLogin(
      { userId: 999, password: "any", totpCode: "" },
      baseNow,
    );

    expect(result.status).toBe("invalid");
    expect(sessionMocks.createSession).not.toHaveBeenCalled();
  });

  it("increments counter for wrong password", async () => {
    dbMocks.select.mockReturnValue(selectReturning([userWithTotp]));
    passwordMocks.verifyPassword.mockResolvedValue(false);

    let setValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(updateChain((v) => { setValues = v; }));

    const result = await beginLogin(
      { userId: 1, password: "wrong", totpCode: "" },
      baseNow,
    );

    expect(result.status).toBe("invalid");
    expect(setValues.failedLoginCount).toBe(1);
    expect(sessionMocks.createSession).not.toHaveBeenCalled();
  });

  it("does not let a stale failure update clear an active lockout", async () => {
    dbMocks.select.mockReturnValue(selectReturning([userWithTotp]));
    passwordMocks.verifyPassword.mockResolvedValue(false);
    let whereCondition: unknown;
    dbMocks.update.mockReturnValue(
      updateReturningChain(
        [{ id: 1 }],
        undefined,
        (condition) => {
          whereCondition = condition;
        },
      ),
    );

    await beginLogin(
      { userId: 1, password: "wrong", totpCode: "" },
      baseNow,
    );

    const query = new PgDialect().sqlToQuery(
      (whereCondition as SQLWrapper).getSQL(),
    );
    expect(query.sql).toContain('"locked_until" is null');
  });

  it("fails safely when concurrent counter updates never make progress", async () => {
    dbMocks.select.mockReturnValue(selectReturning([userWithTotp]));
    passwordMocks.verifyPassword.mockResolvedValue(false);
    dbMocks.update.mockReturnValue(updateReturningChain([]));

    await expect(
      beginLogin(
        { userId: 1, password: "wrong", totpCode: "" },
        baseNow,
      ),
    ).rejects.toThrow("Could not update failed login count");
  });

  it("increments the same counter for wrong TOTP", async () => {
    dbMocks.select.mockReturnValue(selectReturning([userWithTotp]));
    passwordMocks.verifyPassword.mockResolvedValue(true);
    totpMocks.verifyTotpCode.mockReturnValue({ valid: false, counter: null });

    let setValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(updateChain((v) => { setValues = v; }));

    const result = await beginLogin(
      { userId: 1, password: "correct", totpCode: "000000" },
      baseNow,
    );

    expect(result.status).toBe("invalid");
    expect(setValues.failedLoginCount).toBe(1);
  });

  it("locks the account after five consecutive failures", async () => {
    const userWith4Failures = { ...userWithTotp, failedLoginCount: 4 };
    dbMocks.select.mockReturnValue(selectReturning([userWith4Failures]));
    passwordMocks.verifyPassword.mockResolvedValue(false);

    let setValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(updateChain((v) => { setValues = v; }));

    await beginLogin(
      { userId: 1, password: "wrong", totpCode: "" },
      baseNow,
    );

    expect(setValues.failedLoginCount).toBe(0);
    expect(setValues.lockedUntil).toEqual(
      new Date(baseNow.getTime() + AUTH_LIMITS.lockoutMs),
    );
  });

  it("skips password verification when locked and returns invalid", async () => {
    const lockedUser = {
      ...userWithTotp,
      lockedUntil: new Date(baseNow.getTime() + 60_000),
    };
    dbMocks.select.mockReturnValue(selectReturning([lockedUser]));

    const result = await beginLogin(
      { userId: 1, password: "correct", totpCode: "123456" },
      baseNow,
    );

    expect(result.status).toBe("invalid");
    expect(passwordMocks.verifyPassword).not.toHaveBeenCalled();
  });

  it("clears an expired lockout and proceeds with the attempt", async () => {
    const expiredLockUser = {
      ...userWithTotp,
      lockedUntil: new Date(baseNow.getTime() - 1),
      failedLoginCount: 3,
    };
    dbMocks.select.mockReturnValue(selectReturning([expiredLockUser]));
    passwordMocks.verifyPassword.mockResolvedValue(true);

    dbMocks.update
      .mockReturnValueOnce(updateChain()) // clear lockout
      .mockReturnValueOnce(updateChain()); // persist counter

    const result = await beginLogin(
      { userId: 1, password: "correct", totpCode: "123456" },
      baseNow,
    );

    expect(result).toEqual({ status: "authenticated" });
    expect(dbMocks.update).toHaveBeenCalledTimes(2);
  });

  it("rejects replayed TOTP counter and increments failures", async () => {
    dbMocks.select.mockReturnValue(selectReturning([userWithTotp]));
    passwordMocks.verifyPassword.mockResolvedValue(true);
    // counter 100 equals lastTotpCounter 100
    totpMocks.verifyTotpCode.mockReturnValue({ valid: true, counter: 100 });

    let setValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(updateChain((v) => { setValues = v; }));

    const result = await beginLogin(
      { userId: 1, password: "correct", totpCode: "123456" },
      baseNow,
    );

    expect(result.status).toBe("invalid");
    expect(setValues.failedLoginCount).toBe(1);
  });

  it("creates a set_password challenge for temp password + existing TOTP", async () => {
    dbMocks.select.mockReturnValue(selectReturning([userTempPasswordWithTotp]));
    passwordMocks.verifyPassword.mockResolvedValue(true);

    const result = await beginLogin(
      { userId: 1, password: "temp-pass", totpCode: "123456" },
      baseNow,
    );

    expect(result).toEqual({ status: "set_password" });
    expect(challengeMocks.createChallenge).toHaveBeenCalledWith(
      1,
      "set_password",
      baseNow,
    );
    expect(dbMocks.update).toHaveBeenCalled();
    expect(sessionMocks.createSession).not.toHaveBeenCalled();
  });

  it("rejects a concurrent replay of the accepted TOTP counter", async () => {
    dbMocks.select.mockReturnValue(selectReturning([userTempPasswordWithTotp]));
    passwordMocks.verifyPassword.mockResolvedValue(true);
    dbMocks.update
      .mockReturnValueOnce(updateReturningChain([]))
      .mockReturnValueOnce(updateReturningChain([{ id: 1 }]));

    const result = await beginLogin(
      { userId: 1, password: "temp-pass", totpCode: "123456" },
      baseNow,
    );

    expect(result.status).toBe("invalid");
    expect(challengeMocks.createChallenge).not.toHaveBeenCalled();
  });

  it("creates a set_password challenge for temp password + no TOTP", async () => {
    dbMocks.select.mockReturnValue(selectReturning([userTempPasswordNoTotp]));
    passwordMocks.verifyPassword.mockResolvedValue(true);

    const result = await beginLogin(
      { userId: 1, password: "temp-pass", totpCode: "" },
      baseNow,
    );

    expect(result).toEqual({ status: "set_password" });
    expect(challengeMocks.createChallenge).toHaveBeenCalledWith(
      1,
      "set_password",
      baseNow,
    );
    expect(totpMocks.verifyTotpCode).not.toHaveBeenCalled();
    expect(sessionMocks.createSession).not.toHaveBeenCalled();
  });

  it("creates an enroll_totp challenge for permanent password + no TOTP", async () => {
    dbMocks.select.mockReturnValue(selectReturning([userNoTotp]));
    passwordMocks.verifyPassword.mockResolvedValue(true);

    const result = await beginLogin(
      { userId: 1, password: "correct", totpCode: "" },
      baseNow,
    );

    expect(result).toEqual({ status: "enroll_totp" });
    expect(challengeMocks.createChallenge).toHaveBeenCalledWith(
      1,
      "enroll_totp",
      baseNow,
    );
    expect(sessionMocks.createSession).not.toHaveBeenCalled();
  });

  it("returns invalid for a user with no password hash", async () => {
    const noHashUser = { ...userWithTotp, passwordHash: null };
    dbMocks.select.mockReturnValue(selectReturning([noHashUser]));

    const result = await beginLogin(
      { userId: 1, password: "any", totpCode: "" },
      baseNow,
    );

    expect(result.status).toBe("invalid");
  });

  it("uses the same generic message for missing user, bad password, and lockout", async () => {
    // Missing user
    dbMocks.select.mockReturnValue(selectReturning([]));
    const r1 = await beginLogin({ userId: 1, password: "x", totpCode: "" }, baseNow);

    // Wrong password
    dbMocks.select.mockReturnValue(selectReturning([userWithTotp]));
    passwordMocks.verifyPassword.mockResolvedValue(false);
    dbMocks.update.mockReturnValue(updateChain());
    const r2 = await beginLogin({ userId: 1, password: "wrong", totpCode: "" }, baseNow);

    // Locked
    const lockedUser = {
      ...userWithTotp,
      lockedUntil: new Date(baseNow.getTime() + 60_000),
    };
    dbMocks.select.mockReturnValue(selectReturning([lockedUser]));
    const r3 = await beginLogin({ userId: 1, password: "x", totpCode: "" }, baseNow);

    expect(r1.status).toBe("invalid");
    expect(r2.status).toBe("invalid");
    expect(r3.status).toBe("invalid");
    const msg = (r1 as { message: string }).message;
    expect((r2 as { message: string }).message).toBe(msg);
    expect((r3 as { message: string }).message).toBe(msg);
  });
});

// ── completePasswordSetup ─────────────────────────────────────────────────

describe("completePasswordSetup", () => {
  beforeEach(() => {
    cookieMocks.getChallengeToken.mockResolvedValue("challenge-tok");
    challengeMocks.findValidChallenge.mockResolvedValue(setPasswordChallenge);
    dbMocks.select.mockReturnValue(selectReturning([userTempPasswordWithTotp]));
    dbMocks.update.mockReturnValue(updateChain());
  });

  it("returns expired when no challenge cookie exists", async () => {
    cookieMocks.getChallengeToken.mockResolvedValue(undefined);
    const result = await completePasswordSetup(
      { password: "new-password-123", confirmation: "new-password-123" },
      baseNow,
    );
    expect(result.status).toBe("expired");
  });

  it("returns expired when the challenge is invalid", async () => {
    challengeMocks.findValidChallenge.mockResolvedValue(null);
    const result = await completePasswordSetup(
      { password: "new-password-123", confirmation: "new-password-123" },
      baseNow,
    );
    expect(result.status).toBe("expired");
  });

  it("returns invalid when password validation fails", async () => {
    passwordMocks.validateNewPassword.mockReturnValue(
      "Password must contain 12 to 128 characters.",
    );
    const result = await completePasswordSetup(
      { password: "short", confirmation: "short" },
      baseNow,
    );
    expect(result).toEqual({
      status: "invalid",
      message: "Password must contain 12 to 128 characters.",
    });
  });

  it("rejects password that matches current temporary-password hash", async () => {
    passwordMocks.verifyPassword.mockResolvedValue(true);
    const result = await completePasswordSetup(
      { password: "reused-password-123", confirmation: "reused-password-123" },
      baseNow,
    );
    expect(result.status).toBe("invalid");
  });

  it("advances to enroll_totp when user has no TOTP", async () => {
    dbMocks.select.mockReturnValue(selectReturning([userTempPasswordNoTotp]));

    const result = await completePasswordSetup(
      { password: "new-password-123", confirmation: "new-password-123" },
      baseNow,
    );

    expect(result).toEqual({ status: "enroll_totp" });
    expect(dbMocks.transaction).toHaveBeenCalled();
    expect(cookieMocks.setChallengeCookie).toHaveBeenCalled();
    expect(sessionMocks.createSession).not.toHaveBeenCalled();
  });

  it("stores a pending password hash on the challenge without updating the user before TOTP enrollment", async () => {
    dbMocks.select.mockReturnValue(selectReturning([userTempPasswordNoTotp]));
    const sets: Record<string, unknown>[] = [];
    dbMocks.update.mockReturnValue(updateChain((v) => sets.push(v)));

    const result = await completePasswordSetup(
      { password: "new-password-123", confirmation: "new-password-123" },
      baseNow,
    );

    expect(result).toEqual({ status: "enroll_totp" });
    expect(challengeMocks.advanceChallenge).toHaveBeenCalledWith(
      setPasswordChallenge,
      expect.objectContaining({
        stage: "enroll_totp",
        pendingPasswordHash: "$new-argon2-hash",
      }),
      baseNow,
      dbMocks,
    );
    expect(
      sets.some((setValues) => (
        "passwordHash" in setValues || "mustSetPassword" in setValues
      )),
    ).toBe(false);
  });

  it("creates a session when user already has TOTP", async () => {
    const result = await completePasswordSetup(
      { password: "new-password-123", confirmation: "new-password-123" },
      baseNow,
    );

    expect(result).toEqual({ status: "authenticated" });
    expect(dbMocks.transaction).toHaveBeenCalled();
    expect(cookieMocks.clearChallengeCookie).toHaveBeenCalled();
    expect(sessionMocks.createSession).toHaveBeenCalledWith(1, baseNow);
  });

  it("does not create a session when another request consumed the password challenge", async () => {
    challengeMocks.consumeChallenge.mockResolvedValue(false);

    const result = await completePasswordSetup(
      { password: "new-password-123", confirmation: "new-password-123" },
      baseNow,
    );

    expect(result.status).toBe("expired");
    expect(sessionMocks.createSession).not.toHaveBeenCalled();
  });

  it("updates password hash and clears mustSetPassword in the transaction", async () => {
    const sets: Record<string, unknown>[] = [];
    dbMocks.update.mockReturnValue(updateChain((v) => sets.push(v)));

    await completePasswordSetup(
      { password: "new-password-123", confirmation: "new-password-123" },
      baseNow,
    );

    const userSet = sets.find((s) => "passwordHash" in s);
    expect(userSet).toBeDefined();
    expect(userSet!.passwordHash).toBe("$new-argon2-hash");
    expect(userSet!.mustSetPassword).toBe(false);
  });

  it("does not create a session before password setup completes (no TOTP path)", async () => {
    dbMocks.select.mockReturnValue(selectReturning([userTempPasswordNoTotp]));

    const result = await completePasswordSetup(
      { password: "new-password-123", confirmation: "new-password-123" },
      baseNow,
    );

    expect(result.status).toBe("enroll_totp");
    expect(sessionMocks.createSession).not.toHaveBeenCalled();
  });
});

// ── beginTotpEnrollment ───────────────────────────────────────────────────

describe("beginTotpEnrollment", () => {
  beforeEach(() => {
    cookieMocks.getChallengeToken.mockResolvedValue("enroll-tok");
    challengeMocks.findValidChallenge.mockResolvedValue({
      ...enrollChallenge,
      pendingTotpSecretEncrypted: null,
    });
    dbMocks.select.mockReturnValue(selectReturning([userNoTotp]));
  });

  it("returns the enrollment secret and URI", async () => {
    const result = await beginTotpEnrollment(baseNow);

    expect(result).toEqual({
      status: "enroll_totp",
      manualSecret: "NEWSECRETBASE32",
      uri: expect.stringContaining("otpauth://"),
    });
  });

  it("encrypts the pending secret and stores it on the challenge", async () => {
    await beginTotpEnrollment(baseNow);

    expect(encryptionMocks.encryptTotpSecret).toHaveBeenCalledWith(
      "NEWSECRETBASE32",
    );
    expect(challengeMocks.storePendingTotpSecret).toHaveBeenCalledWith(
      expect.objectContaining({ id: enrollChallenge.id }),
      "v1.new-encrypted",
      baseNow,
    );
  });

  it("reuses the pending enrollment secret on repeated display", async () => {
    challengeMocks.findValidChallenge.mockResolvedValue(enrollChallenge);
    encryptionMocks.decryptTotpSecret.mockReturnValue("EXISTINGSECRET");
    totpMocks.createTotpEnrollment.mockReturnValue({
      secret: "EXISTINGSECRET",
      uri: "otpauth://existing",
    });

    const result = await beginTotpEnrollment(baseNow);

    expect(result).toEqual({
      status: "enroll_totp",
      manualSecret: "EXISTINGSECRET",
      uri: "otpauth://existing",
    });
    expect(challengeMocks.storePendingTotpSecret).not.toHaveBeenCalled();
  });

  it("returns expired when challenge is invalid", async () => {
    challengeMocks.findValidChallenge.mockResolvedValue(null);
    const result = await beginTotpEnrollment(baseNow);
    expect(result.status).toBe("expired");
  });

  it("returns expired when no challenge cookie exists", async () => {
    cookieMocks.getChallengeToken.mockResolvedValue(undefined);
    const result = await beginTotpEnrollment(baseNow);
    expect(result.status).toBe("expired");
  });
});

// ── completeTotpEnrollment ────────────────────────────────────────────────

describe("completeTotpEnrollment", () => {
  beforeEach(() => {
    cookieMocks.getChallengeToken.mockResolvedValue("enroll-tok");
    challengeMocks.findValidChallenge.mockResolvedValue(enrollChallenge);
    dbMocks.update.mockReturnValue(updateChain());
  });

  it("moves encrypted secret to user and creates a session", async () => {
    const sets: Record<string, unknown>[] = [];
    dbMocks.update.mockReturnValue(updateChain((v) => sets.push(v)));

    const result = await completeTotpEnrollment("123456", baseNow);

    expect(result).toEqual({ status: "authenticated" });
    expect(dbMocks.transaction).toHaveBeenCalled();

    const userSet = sets.find((s) => "totpSecretEncrypted" in s);
    expect(userSet).toBeDefined();
    expect(userSet!.totpSecretEncrypted).toBe("v1.pending-encrypted");
    expect(userSet!.totpEnabledAt).toEqual(baseNow);
    expect(userSet!.lastTotpCounter).toBe(200);
    expect(userSet!.failedLoginCount).toBe(0);
    expect(userSet!.lockedUntil).toBeNull();

    expect(cookieMocks.clearChallengeCookie).toHaveBeenCalled();
    expect(sessionMocks.createSession).toHaveBeenCalledWith(1, baseNow);
  });

  it("applies a pending password hash in the same transaction as TOTP enrollment", async () => {
    challengeMocks.findValidChallenge.mockResolvedValue(
      enrollChallengeWithPendingPassword,
    );
    const sets: Record<string, unknown>[] = [];
    dbMocks.update.mockReturnValue(updateChain((v) => sets.push(v)));

    const result = await completeTotpEnrollment("123456", baseNow);

    expect(result).toEqual({ status: "authenticated" });
    const userSet = sets.find((s) => "totpSecretEncrypted" in s);
    expect(userSet).toBeDefined();
    expect(userSet!.passwordHash).toBe("$new-argon2-hash");
    expect(userSet!.mustSetPassword).toBe(false);
  });

  it("keeps the current password unchanged for TOTP-only enrollment", async () => {
    const sets: Record<string, unknown>[] = [];
    dbMocks.update.mockReturnValue(updateChain((v) => sets.push(v)));

    const result = await completeTotpEnrollment("123456", baseNow);

    expect(result).toEqual({ status: "authenticated" });
    const userSet = sets.find((s) => "totpSecretEncrypted" in s);
    expect(userSet).toBeDefined();
    expect(userSet).not.toHaveProperty("passwordHash");
    expect(userSet).not.toHaveProperty("mustSetPassword");
  });

  it("returns invalid for a wrong verification code", async () => {
    totpMocks.verifyTotpCode.mockReturnValue({ valid: false, counter: null });

    const result = await completeTotpEnrollment("000000", baseNow);

    expect(result.status).toBe("invalid");
    expect(sessionMocks.createSession).not.toHaveBeenCalled();
  });

  it("does not create a second session when the challenge was already consumed", async () => {
    challengeMocks.consumeChallenge.mockResolvedValue(false);

    const result = await completeTotpEnrollment("123456", baseNow);

    expect(result.status).toBe("expired");
    expect(sessionMocks.createSession).not.toHaveBeenCalled();
  });

  it("returns expired when no pending secret exists on the challenge", async () => {
    challengeMocks.findValidChallenge.mockResolvedValue({
      ...enrollChallenge,
      pendingTotpSecretEncrypted: null,
    });

    const result = await completeTotpEnrollment("123456", baseNow);
    expect(result.status).toBe("expired");
  });

  it("returns expired when challenge is invalid", async () => {
    challengeMocks.findValidChallenge.mockResolvedValue(null);
    const result = await completeTotpEnrollment("123456", baseNow);
    expect(result.status).toBe("expired");
  });

  it("consumes the challenge and clears pending secret in the transaction", async () => {
    await completeTotpEnrollment("123456", baseNow);

    expect(challengeMocks.consumeChallenge).toHaveBeenCalledWith(
      enrollChallenge,
      baseNow,
      dbMocks,
    );
  });
});
