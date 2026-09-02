import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
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
  createSession,
  findSessionByToken,
  refreshSession,
  revokeAllUserSessions,
  revokeSessionByToken,
} from "./sessions";
import { AUTH_LIMITS } from "./constants";

// ── Mock chain helpers ─────────────────────────────────────────────────────

/** select().from().innerJoin().where().limit() or select().from().where().limit() */
function selectReturning(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn(() => ({ limit }));
  const innerJoin = vi.fn(() => ({ where }));
  return { from: vi.fn(() => ({ innerJoin, where })) };
}

/** insert(table).values({}).returning() */
function insertReturning(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn(() => ({ returning }));
  return { values };
}

/** update(table).set({}).where() — captures set values via onSet callback */
function updateChain(onSet?: (values: Record<string, unknown>) => void) {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn((values: Record<string, unknown>) => {
    onSet?.(values);
    return { where };
  });
  return { set };
}

/** delete(table).where() */
function deleteChain() {
  return { where: vi.fn().mockResolvedValue(undefined) };
}

// ── Fixtures ───────────────────────────────────────────────────────────────

const baseNow = new Date("2026-08-28T12:00:00.000Z");
const baseUser = { id: 2, name: "Alice", avatarPath: null };
const baseSessionRow = {
  id: 1,
  userId: 2,
  createdAt: baseNow,
  lastActiveAt: baseNow,
  idleExpiresAt: new Date(baseNow.getTime() + AUTH_LIMITS.idleSessionMs),
  absoluteExpiresAt: new Date(baseNow.getTime() + AUTH_LIMITS.absoluteSessionMs),
  revokedAt: null,
  user: baseUser,
};

const insertedRow = {
  ...baseSessionRow,
  tokenHash: "hashed-token",
  revocationReason: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  cookieMocks.setSessionCookie.mockResolvedValue(undefined);
  cookieMocks.clearSessionCookie.mockResolvedValue(undefined);
});

// ── createSession ──────────────────────────────────────────────────────────

describe("createSession", () => {
  beforeEach(() => {
    dbMocks.select.mockReturnValue(selectReturning([baseUser]));
    dbMocks.insert.mockReturnValue(insertReturning([insertedRow]));
  });

  it("creates a 24-hour idle and seven-day absolute session", async () => {
    const session = await createSession(2, baseNow);
    expect(session.idleExpiresAt).toEqual(new Date("2026-08-29T12:00:00.000Z"));
    expect(session.absoluteExpiresAt).toEqual(new Date("2026-09-04T12:00:00.000Z"));
  });

  it("sets the session cookie with a token and the absolute expiry", async () => {
    await createSession(2, baseNow);
    expect(cookieMocks.setSessionCookie).toHaveBeenCalledWith(
      expect.any(String),
      new Date("2026-09-04T12:00:00.000Z"),
    );
  });

  it("deletes the just-created session if setting the cookie fails", async () => {
    cookieMocks.setSessionCookie.mockRejectedValueOnce(new Error("header error"));
    dbMocks.delete.mockReturnValue(deleteChain());

    await expect(createSession(2, baseNow)).rejects.toThrow("header error");
    expect(dbMocks.delete).toHaveBeenCalled();
  });

  it("returns the user's name and avatar in the session", async () => {
    const session = await createSession(2, baseNow);
    expect(session.user).toEqual(baseUser);
  });

  it("sets lastActiveAt and createdAt to now", async () => {
    const session = await createSession(2, baseNow);
    expect(session.lastActiveAt).toEqual(baseNow);
    expect(session.createdAt).toEqual(baseNow);
  });
});

// ── findSessionByToken ─────────────────────────────────────────────────────

describe("findSessionByToken", () => {
  const token = "valid-test-token";

  it("returns null for an unknown token", async () => {
    dbMocks.select.mockReturnValue(selectReturning([]));
    const result = await findSessionByToken(token, baseNow);
    expect(result).toBeNull();
  });

  it("returns null for a revoked session without touching cookies", async () => {
    const revokedRow = {
      ...baseSessionRow,
      revokedAt: new Date("2026-08-27T10:00:00.000Z"),
    };
    dbMocks.select.mockReturnValue(selectReturning([revokedRow]));

    const result = await findSessionByToken(token, baseNow);
    expect(result).toBeNull();
    expect(cookieMocks.clearSessionCookie).not.toHaveBeenCalled();
    expect(dbMocks.delete).not.toHaveBeenCalled();
  });

  it("returns null for an idle-expired session without touching cookies", async () => {
    const expiredRow = {
      ...baseSessionRow,
      idleExpiresAt: new Date(baseNow.getTime() - 1),
    };
    dbMocks.select.mockReturnValue(selectReturning([expiredRow]));
    dbMocks.delete.mockReturnValue(deleteChain());

    const result = await findSessionByToken(token, baseNow);
    expect(result).toBeNull();
    expect(cookieMocks.clearSessionCookie).not.toHaveBeenCalled();
    expect(dbMocks.delete).toHaveBeenCalled();
  });

  it("returns null for an absolute-expired session without touching cookies", async () => {
    const expiredRow = {
      ...baseSessionRow,
      absoluteExpiresAt: new Date(baseNow.getTime() - 1),
    };
    dbMocks.select.mockReturnValue(selectReturning([expiredRow]));
    dbMocks.delete.mockReturnValue(deleteChain());

    const result = await findSessionByToken(token, baseNow);
    expect(result).toBeNull();
    expect(cookieMocks.clearSessionCookie).not.toHaveBeenCalled();
    expect(dbMocks.delete).toHaveBeenCalled();
  });

  it("does not refresh activity inside five minutes", async () => {
    dbMocks.select.mockReturnValue(selectReturning([baseSessionRow]));
    const justUnder5Min = new Date(
      baseNow.getTime() + AUTH_LIMITS.activityWriteIntervalMs - 1000,
    );

    await findSessionByToken(token, justUnder5Min);
    expect(dbMocks.update).not.toHaveBeenCalled();
  });

  it("refreshes activity after five or more minutes of inactivity", async () => {
    dbMocks.select.mockReturnValue(selectReturning([baseSessionRow]));
    const after5Min = new Date(
      baseNow.getTime() + AUTH_LIMITS.activityWriteIntervalMs,
    );

    let updateValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(updateChain((v) => { updateValues = v; }));

    await findSessionByToken(token, after5Min);
    expect(dbMocks.update).toHaveBeenCalled();
    expect(updateValues.lastActiveAt).toEqual(after5Min);
  });

  it("caps refreshed idle expiry at the absolute expiry", async () => {
    const absoluteExpiry = new Date("2026-09-04T12:00:00.000Z");
    const nearEndRow = {
      ...baseSessionRow,
      lastActiveAt: new Date("2026-09-04T11:00:00.000Z"),
      idleExpiresAt: new Date("2026-09-05T11:00:00.000Z"),
      absoluteExpiresAt: absoluteExpiry,
    };
    dbMocks.select.mockReturnValue(selectReturning([nearEndRow]));

    let updateValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(updateChain((v) => { updateValues = v; }));

    await findSessionByToken(token, new Date("2026-09-04T11:30:00.000Z"));
    expect(updateValues.idleExpiresAt).toEqual(absoluteExpiry);
  });

  it("returns the correct AuthenticatedSession fields for a valid token", async () => {
    dbMocks.select.mockReturnValue(selectReturning([baseSessionRow]));

    const session = await findSessionByToken(token, baseNow);
    expect(session).not.toBeNull();
    expect(session!.id).toBe(1);
    expect(session!.user).toEqual(baseUser);
    expect(session!.idleExpiresAt).toEqual(baseSessionRow.idleExpiresAt);
    expect(session!.absoluteExpiresAt).toEqual(baseSessionRow.absoluteExpiresAt);
  });

  it("returns refreshed fields when the session is refreshed", async () => {
    dbMocks.select.mockReturnValue(selectReturning([baseSessionRow]));
    const after5Min = new Date(
      baseNow.getTime() + AUTH_LIMITS.activityWriteIntervalMs,
    );
    dbMocks.update.mockReturnValue(updateChain());

    const session = await findSessionByToken(token, after5Min);
    expect(session!.lastActiveAt).toEqual(after5Min);
  });
});

// ── refreshSession ─────────────────────────────────────────────────────────

describe("refreshSession", () => {
  it("updates lastActiveAt and idleExpiresAt", async () => {
    const absoluteExpiresAt = new Date(
      baseNow.getTime() + AUTH_LIMITS.absoluteSessionMs,
    );
    dbMocks.select.mockReturnValue(selectReturning([{
      absoluteExpiresAt,
      idleExpiresAt: new Date(baseNow.getTime() + AUTH_LIMITS.idleSessionMs),
      revokedAt: null,
    }]));

    let updateValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(updateChain((v) => { updateValues = v; }));

    const refreshAt = new Date(baseNow.getTime() + 60_000);
    await refreshSession(1, refreshAt);

    expect(updateValues.lastActiveAt).toEqual(refreshAt);
    expect(updateValues.idleExpiresAt).toEqual(
      new Date(refreshAt.getTime() + AUTH_LIMITS.idleSessionMs),
    );
  });

  it("caps the refreshed idle expiry at the absolute expiry", async () => {
    const absoluteExpiresAt = new Date("2026-09-04T12:00:00.000Z");
    dbMocks.select.mockReturnValue(selectReturning([{
      absoluteExpiresAt,
      idleExpiresAt: new Date("2026-09-04T11:45:00.000Z"),
      revokedAt: null,
    }]));

    let updateValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(updateChain((v) => { updateValues = v; }));

    const refreshAt = new Date("2026-09-04T11:30:00.000Z");
    await refreshSession(1, refreshAt);

    expect(updateValues.idleExpiresAt).toEqual(absoluteExpiresAt);
  });

  it("does not update if the session is not found", async () => {
    dbMocks.select.mockReturnValue(selectReturning([]));
    await refreshSession(999, baseNow);
    expect(dbMocks.update).not.toHaveBeenCalled();
  });

  it("does not update a revoked session", async () => {
    dbMocks.select.mockReturnValue(selectReturning([{
      absoluteExpiresAt: new Date(baseNow.getTime() + AUTH_LIMITS.absoluteSessionMs),
      idleExpiresAt: new Date(baseNow.getTime() + AUTH_LIMITS.idleSessionMs),
      revokedAt: new Date("2026-08-28T11:00:00.000Z"),
    }]));
    await refreshSession(1, baseNow);
    expect(dbMocks.update).not.toHaveBeenCalled();
  });

  it("does not update an idle-expired session", async () => {
    dbMocks.select.mockReturnValue(selectReturning([{
      absoluteExpiresAt: new Date(baseNow.getTime() + AUTH_LIMITS.absoluteSessionMs),
      idleExpiresAt: new Date(baseNow.getTime() - 1),
      revokedAt: null,
    }]));
    await refreshSession(1, baseNow);
    expect(dbMocks.update).not.toHaveBeenCalled();
  });

  it("does not update an absolute-expired session", async () => {
    dbMocks.select.mockReturnValue(selectReturning([{
      absoluteExpiresAt: new Date(baseNow.getTime() - 1),
      idleExpiresAt: new Date(baseNow.getTime() + AUTH_LIMITS.idleSessionMs),
      revokedAt: null,
    }]));
    await refreshSession(1, baseNow);
    expect(dbMocks.update).not.toHaveBeenCalled();
  });
});

// ── revokeSessionByToken ───────────────────────────────────────────────────

describe("revokeSessionByToken", () => {
  it("marks the session as revoked with a reason and clears the cookie", async () => {
    const revokeAt = new Date("2026-08-28T13:00:00.000Z");
    let updateValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(updateChain((v) => { updateValues = v; }));

    await revokeSessionByToken("some-token", "logout", revokeAt);

    expect(dbMocks.update).toHaveBeenCalled();
    expect(updateValues.revokedAt).toEqual(revokeAt);
    expect(updateValues.revocationReason).toBe("logout");
    expect(cookieMocks.clearSessionCookie).toHaveBeenCalled();
  });
});

// ── revokeAllUserSessions ──────────────────────────────────────────────────

describe("revokeAllUserSessions", () => {
  it("marks all sessions for a user as revoked with a reason", async () => {
    const revokeAt = new Date("2026-08-28T14:00:00.000Z");
    let updateValues: Record<string, unknown> = {};
    dbMocks.update.mockReturnValue(updateChain((v) => { updateValues = v; }));

    await revokeAllUserSessions(2, "password changed", revokeAt);

    expect(dbMocks.update).toHaveBeenCalled();
    expect(updateValues.revokedAt).toEqual(revokeAt);
    expect(updateValues.revocationReason).toBe("password changed");
  });

  it("uses a custom database instance when provided", async () => {
    const customWhere = vi.fn().mockResolvedValue(undefined);
    const customSet = vi.fn(() => ({ where: customWhere }));
    const customUpdate = vi.fn(() => ({ set: customSet }));
    const customDb = { update: customUpdate };

    await revokeAllUserSessions(
      2,
      "admin:test-reason",
      baseNow,
      customDb as unknown as Parameters<typeof revokeAllUserSessions>[3],
    );

    expect(customUpdate).toHaveBeenCalled();
    expect(dbMocks.update).not.toHaveBeenCalled();
    expect(customSet).toHaveBeenCalledWith(
      expect.objectContaining({
        revokedAt: baseNow,
        revocationReason: "admin:test-reason",
      }),
    );
  });
});
