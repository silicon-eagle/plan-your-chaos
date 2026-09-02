import "server-only";

import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginChallenges } from "@/db/schema";
import { AUTH_LIMITS } from "./constants";
import { setChallengeCookie } from "./cookies";
import { generateOpaqueToken, hashOpaqueToken } from "./tokens";

export type ValidatedChallenge = {
  id: number;
  userId: number;
  stage: "set_password" | "enroll_totp";
  tokenHash: string;
  pendingPasswordHash: string | null;
  pendingTotpSecretEncrypted: string | null;
  expiresAt: Date;
};

type ChallengeDatabase = Pick<typeof db, "update">;

function validChallengeWhere(
  challenge: ValidatedChallenge,
  now: Date,
) {
  return and(
    eq(loginChallenges.id, challenge.id),
    eq(loginChallenges.tokenHash, challenge.tokenHash),
    eq(loginChallenges.stage, challenge.stage),
    isNull(loginChallenges.consumedAt),
    gt(loginChallenges.expiresAt, now),
  );
}

export async function createChallenge(
  userId: number,
  stage: "set_password" | "enroll_totp",
  now = new Date(),
): Promise<void> {
  const token = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(now.getTime() + AUTH_LIMITS.challengeLifetimeMs);

  await db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(${userId})`,
    );
    await invalidateUserChallenges(userId, now, transaction);
    await transaction.insert(loginChallenges).values({
      userId,
      tokenHash,
      stage,
      expiresAt,
    });
  });

  await setChallengeCookie(token, expiresAt);
}

export async function findValidChallenge(
  token: string,
  expectedStage: "set_password" | "enroll_totp",
  now = new Date(),
): Promise<ValidatedChallenge | null> {
  const tokenHash = hashOpaqueToken(token);

  const [challenge] = await db
    .select({
      id: loginChallenges.id,
      userId: loginChallenges.userId,
      stage: loginChallenges.stage,
      tokenHash: loginChallenges.tokenHash,
      pendingPasswordHash: loginChallenges.pendingPasswordHash,
      pendingTotpSecretEncrypted: loginChallenges.pendingTotpSecretEncrypted,
      expiresAt: loginChallenges.expiresAt,
      consumedAt: loginChallenges.consumedAt,
    })
    .from(loginChallenges)
    .where(eq(loginChallenges.tokenHash, tokenHash))
    .limit(1);

  if (!challenge) return null;
  if (challenge.stage !== expectedStage) return null;
  if (challenge.consumedAt !== null) return null;
  if (now >= challenge.expiresAt) return null;

  return {
    id: challenge.id,
    userId: challenge.userId,
    stage: challenge.stage,
    tokenHash: challenge.tokenHash,
    pendingPasswordHash: challenge.pendingPasswordHash,
    pendingTotpSecretEncrypted: challenge.pendingTotpSecretEncrypted,
    expiresAt: challenge.expiresAt,
  };
}

export async function storePendingTotpSecret(
  challenge: ValidatedChallenge,
  encryptedSecret: string,
  now: Date,
  database: ChallengeDatabase = db,
): Promise<boolean> {
  const updated = await database
    .update(loginChallenges)
    .set({ pendingTotpSecretEncrypted: encryptedSecret })
    .where(
      and(
        validChallengeWhere(challenge, now),
        isNull(loginChallenges.pendingTotpSecretEncrypted),
      ),
    )
    .returning({ id: loginChallenges.id });
  return updated.length === 1;
}

export async function advanceChallenge(
  challenge: ValidatedChallenge,
  changes: {
    tokenHash: string;
    stage: "set_password" | "enroll_totp";
    expiresAt: Date;
    pendingPasswordHash?: string | null;
  },
  now: Date,
  database: ChallengeDatabase = db,
): Promise<boolean> {
  const updated = await database
    .update(loginChallenges)
    .set(changes)
    .where(validChallengeWhere(challenge, now))
    .returning({ id: loginChallenges.id });
  return updated.length === 1;
}

export async function consumeChallenge(
  challenge: ValidatedChallenge,
  now: Date,
  database: ChallengeDatabase = db,
): Promise<boolean> {
  const updated = await database
    .update(loginChallenges)
    .set({
      pendingPasswordHash: null,
      pendingTotpSecretEncrypted: null,
      consumedAt: now,
    })
    .where(validChallengeWhere(challenge, now))
    .returning({ id: loginChallenges.id });
  return updated.length === 1;
}

export async function invalidateUserChallenges(
  userId: number,
  now = new Date(),
  database: ChallengeDatabase = db,
): Promise<void> {
  await database
    .update(loginChallenges)
    .set({ consumedAt: now })
    .where(
      and(
        eq(loginChallenges.userId, userId),
        isNull(loginChallenges.consumedAt),
      ),
    );
}
