import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { AUTH_LIMITS } from "./constants";
import { clearSessionCookie, setSessionCookie } from "./cookies";
import { UserNotFoundError } from "./errors";
import { generateOpaqueToken, hashOpaqueToken } from "./tokens";

type SessionDatabase = Pick<typeof db, "update">;

export type AuthenticatedSession = {
  id: number;
  user: {
    id: number;
    name: string;
    avatarPath: string | null;
  };
  createdAt: Date;
  lastActiveAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
};

export async function createSession(
  userId: number,
  now = new Date(),
): Promise<AuthenticatedSession> {
  const token = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const idleExpiresAt = new Date(now.getTime() + AUTH_LIMITS.idleSessionMs);
  const absoluteExpiresAt = new Date(
    now.getTime() + AUTH_LIMITS.absoluteSessionMs,
  );

  const [user] = await db
    .select({ id: users.id, name: users.name, avatarPath: users.avatarPath })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new UserNotFoundError(userId);
  }

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      tokenHash,
      lastActiveAt: now,
      idleExpiresAt,
      absoluteExpiresAt,
    })
    .returning();

  try {
    await setSessionCookie(token, absoluteExpiresAt);
  } catch (error) {
    // Browser cookies are out-of-band with PostgreSQL and cannot join a
    // database transaction; delete the orphaned row as a compensating action.
    await db.delete(sessions).where(eq(sessions.id, session.id));
    throw error;
  }

  return {
    id: session.id,
    user,
    createdAt: session.createdAt,
    lastActiveAt: session.lastActiveAt,
    idleExpiresAt: session.idleExpiresAt,
    absoluteExpiresAt: session.absoluteExpiresAt,
  };
}

export async function findSessionByToken(
  token: string,
  now = new Date(),
): Promise<AuthenticatedSession | null> {
  const tokenHash = hashOpaqueToken(token);

  const [row] = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      createdAt: sessions.createdAt,
      lastActiveAt: sessions.lastActiveAt,
      idleExpiresAt: sessions.idleExpiresAt,
      absoluteExpiresAt: sessions.absoluteExpiresAt,
      revokedAt: sessions.revokedAt,
      user: {
        id: users.id,
        name: users.name,
        avatarPath: users.avatarPath,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!row) {
    return null;
  }

  const isRevoked = row.revokedAt !== null;
  const isIdleExpired = now >= row.idleExpiresAt;
  const isAbsoluteExpired = now >= row.absoluteExpiresAt;

  if (isRevoked) {
    return null;
  }

  if (isIdleExpired || isAbsoluteExpired) {
    await db.delete(sessions).where(eq(sessions.id, row.id));
    return null;
  }

  const msSinceActive = now.getTime() - row.lastActiveAt.getTime();
  if (msSinceActive >= AUTH_LIMITS.activityWriteIntervalMs) {
    const newIdle = new Date(now.getTime() + AUTH_LIMITS.idleSessionMs);
    const idleExpiresAt =
      newIdle > row.absoluteExpiresAt ? row.absoluteExpiresAt : newIdle;

    await db
      .update(sessions)
      .set({ lastActiveAt: now, idleExpiresAt })
      .where(eq(sessions.id, row.id));

    return {
      id: row.id,
      user: row.user,
      createdAt: row.createdAt,
      lastActiveAt: now,
      idleExpiresAt,
      absoluteExpiresAt: row.absoluteExpiresAt,
    };
  }

  return {
    id: row.id,
    user: row.user,
    createdAt: row.createdAt,
    lastActiveAt: row.lastActiveAt,
    idleExpiresAt: row.idleExpiresAt,
    absoluteExpiresAt: row.absoluteExpiresAt,
  };
}

export async function refreshSession(
  sessionId: number,
  now = new Date(),
): Promise<void> {
  const [session] = await db
    .select({
      absoluteExpiresAt: sessions.absoluteExpiresAt,
      idleExpiresAt: sessions.idleExpiresAt,
      revokedAt: sessions.revokedAt,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) {
    return;
  }

  if (
    session.revokedAt !== null ||
    now >= session.idleExpiresAt ||
    now >= session.absoluteExpiresAt
  ) {
    return;
  }

  const newIdle = new Date(now.getTime() + AUTH_LIMITS.idleSessionMs);
  const idleExpiresAt =
    newIdle > session.absoluteExpiresAt ? session.absoluteExpiresAt : newIdle;

  await db
    .update(sessions)
    .set({ lastActiveAt: now, idleExpiresAt })
    .where(eq(sessions.id, sessionId));
}

export async function revokeSessionByToken(
  token: string,
  reason: string,
  now = new Date(),
): Promise<void> {
  const tokenHash = hashOpaqueToken(token);

  await db
    .update(sessions)
    .set({ revokedAt: now, revocationReason: reason })
    .where(eq(sessions.tokenHash, tokenHash));

  await clearSessionCookie();
}

export async function revokeAllUserSessions(
  userId: number,
  reason: string,
  now = new Date(),
  database: SessionDatabase = db,
): Promise<void> {
  await database
    .update(sessions)
    .set({ revokedAt: now, revocationReason: reason })
    .where(eq(sessions.userId, userId));
}
