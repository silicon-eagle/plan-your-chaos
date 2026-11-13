import "server-only";

import { and, eq, isNull, lt, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AUTH_LIMITS } from "./constants";
import {
  advanceChallenge,
  consumeChallenge,
  createChallenge,
  findValidChallenge,
  storePendingTotpSecret,
} from "./challenges";
import {
  clearChallengeCookie,
  getChallengeToken,
  setChallengeCookie,
} from "./cookies";
import {
  hashPassword,
  validateNewPassword,
  verifyPassword,
} from "./passwords";
import { createSession } from "./sessions";
import { generateOpaqueToken, hashOpaqueToken } from "./tokens";
import { createTotpEnrollment, verifyTotpCode } from "./totp";
import { decryptTotpSecret, encryptTotpSecret } from "./totp-encryption";
import { usernameMatches } from "./usernames";

// ── Types ─────────────────────────────────────────────────────────────────

export type LoginInput = {
  username: string;
  password: string;
};

export type PasswordSetupInput = {
  password: string;
  confirmation: string;
};

export type LoginResult =
  | { status: "verify_totp" }
  | { status: "set_password" }
  | { status: "enroll_totp" }
  | { status: "invalid"; message: string };

export type TotpEnrollmentResult =
  | { status: "enroll_totp"; manualSecret: string; uri: string }
  | { status: "expired"; message: string };

export type SetupResult =
  | { status: "authenticated" }
  | { status: "enroll_totp" }
  | { status: "invalid"; message: string }
  | { status: "expired"; message: string };

// ── Constants ─────────────────────────────────────────────────────────────

const GENERIC_FAILURE = "Invalid credentials.";
const CHALLENGE_EXPIRED = "Challenge expired or invalid.";
const PASSWORD_REUSE = "New password cannot match the current password.";
const INVALID_CODE = "Invalid verification code.";

// ── beginLogin ────────────────────────────────────────────────────────────

export async function beginLogin(
  input: LoginInput,
  now = new Date(),
): Promise<LoginResult> {
  // 1. Load user
  const [user] = await db
    .select()
    .from(users)
    .where(usernameMatches(input.username))
    .limit(1);

  if (!user) {
    return { status: "invalid", message: GENERIC_FAILURE };
  }

  // 2. Check lockout
  if (user.lockedUntil) {
    if (now < user.lockedUntil) {
      return { status: "invalid", message: GENERIC_FAILURE };
    }
    // Expired lockout — clear and restart from zero
    await db
      .update(users)
      .set({ lockedUntil: null, failedLoginCount: 0 })
      .where(eq(users.id, user.id));
    user.failedLoginCount = 0;
  }

  // 3. Verify password
  if (!user.passwordHash) {
    return { status: "invalid", message: GENERIC_FAILURE };
  }

  const passwordValid = await verifyPassword(user.passwordHash, input.password);
  if (!passwordValid) {
    await incrementFailedAttempts(user.id, user.failedLoginCount, now);
    return { status: "invalid", message: GENERIC_FAILURE };
  }

  // 4. Verify enrolled TOTP before any required password setup.
  if (user.totpSecretEncrypted && user.totpEnabledAt) {
    await createChallenge(user.id, "verify_totp", now);
    return { status: "verify_totp" };
  }

  if (user.mustSetPassword) {
    await createChallenge(user.id, "set_password", now);
    return { status: "set_password" };
  }

  // TOTP absent — enrollment challenge
  await createChallenge(user.id, "enroll_totp", now);
  return { status: "enroll_totp" };
}

// ── completeTotpLogin ─────────────────────────────────────────────────────

export async function completeTotpLogin(
  code: string,
  now = new Date(),
): Promise<
  | { status: "authenticated" }
  | { status: "set_password" }
  | { status: "invalid"; message: string }
  | { status: "expired"; message: string }
> {
  const token = await getChallengeToken();
  if (!token) return { status: "expired", message: CHALLENGE_EXPIRED };

  const challenge = await findValidChallenge(token, "verify_totp", now);
  if (!challenge) return { status: "expired", message: CHALLENGE_EXPIRED };

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, challenge.userId))
    .limit(1);

  if (!user) return { status: "expired", message: CHALLENGE_EXPIRED };

  if (user.lockedUntil) {
    if (now < user.lockedUntil) {
      return { status: "invalid", message: GENERIC_FAILURE };
    }
    await db
      .update(users)
      .set({ lockedUntil: null, failedLoginCount: 0 })
      .where(eq(users.id, user.id));
    user.failedLoginCount = 0;
  }

  if (!user.totpSecretEncrypted || !user.totpEnabledAt) {
    await incrementFailedAttempts(user.id, user.failedLoginCount, now);
    return { status: "invalid", message: GENERIC_FAILURE };
  }

  const secret = decryptTotpSecret(user.totpSecretEncrypted);
  const totpResult = verifyTotpCode(secret, code, now);
  if (!totpResult.valid) {
    await incrementFailedAttempts(user.id, user.failedLoginCount, now);
    return { status: "invalid", message: GENERIC_FAILURE };
  }

  if (
    user.lastTotpCounter !== null &&
    totpResult.counter !== null &&
    totpResult.counter <= user.lastTotpCounter
  ) {
    await incrementFailedAttempts(user.id, user.failedLoginCount, now);
    return { status: "invalid", message: GENERIC_FAILURE };
  }

  const newToken = user.mustSetPassword ? generateOpaqueToken() : null;
  const newExpiresAt = new Date(now.getTime() + AUTH_LIMITS.challengeLifetimeMs);
  let completed = false;
  try {
    completed = await db.transaction(async (tx) => {
      const counterClaimed = await claimTotpCounter(
        challenge.userId,
        totpResult.counter,
        now,
        tx,
      );
      if (!counterClaimed) return false;

      const challengeClaimed = newToken
        ? await advanceChallenge(challenge, {
            tokenHash: hashOpaqueToken(newToken),
            stage: "set_password",
            expiresAt: newExpiresAt,
          }, now, tx)
        : await consumeChallenge(challenge, now, tx);
      if (!challengeClaimed) throw new TotpCompletionRace();
      return true;
    });
  } catch (error) {
    if (!(error instanceof TotpCompletionRace)) throw error;
  }

  if (!completed) {
    await incrementFailedAttempts(user.id, user.failedLoginCount, now);
    return { status: "invalid", message: GENERIC_FAILURE };
  }

  if (newToken) {
    await setChallengeCookie(newToken, newExpiresAt);
    return { status: "set_password" };
  }

  await clearChallengeCookie();
  await createSession(challenge.userId, now);
  return { status: "authenticated" };
}

// ── completePasswordSetup ─────────────────────────────────────────────────

export async function completePasswordSetup(
  input: PasswordSetupInput,
  now = new Date(),
): Promise<SetupResult> {
  const token = await getChallengeToken();
  if (!token) return { status: "expired", message: CHALLENGE_EXPIRED };

  const challenge = await findValidChallenge(token, "set_password", now);
  if (!challenge) return { status: "expired", message: CHALLENGE_EXPIRED };

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, challenge.userId))
    .limit(1);

  if (!user) return { status: "expired", message: CHALLENGE_EXPIRED };

  // Validate password format
  const validationError = validateNewPassword(
    input.password,
    input.confirmation,
  );
  if (validationError) return { status: "invalid", message: validationError };

  // Reject reuse of current temporary-password hash
  if (user.passwordHash) {
    const isReuse = await verifyPassword(user.passwordHash, input.password);
    if (isReuse) return { status: "invalid", message: PASSWORD_REUSE };
  }

  const newHash = await hashPassword(input.password);
  const needsTotp = !user.totpSecretEncrypted || !user.totpEnabledAt;

  if (needsTotp) {
    // Advance challenge to enroll_totp — atomically with user update
    const newToken = generateOpaqueToken();
    const newTokenHash = hashOpaqueToken(newToken);
    const newExpiresAt = new Date(
      now.getTime() + AUTH_LIMITS.challengeLifetimeMs,
    );

    const advanced = await db.transaction(async (tx) => {
      const claimed = await advanceChallenge(
        challenge,
        {
          tokenHash: newTokenHash,
          stage: "enroll_totp",
          pendingPasswordHash: newHash,
          expiresAt: newExpiresAt,
        },
        now,
        tx,
      );
      return claimed;
    });

    if (!advanced) {
      return { status: "expired", message: CHALLENGE_EXPIRED };
    }
    await setChallengeCookie(newToken, newExpiresAt);
    return { status: "enroll_totp" };
  }

  // User already has TOTP — consume challenge and authenticate
  const consumed = await db.transaction(async (tx) => {
    const claimed = await consumeChallenge(challenge, now, tx);
    if (!claimed) return false;

    await tx
      .update(users)
      .set({ passwordHash: newHash, mustSetPassword: false })
      .where(eq(users.id, challenge.userId));
    return true;
  });

  if (!consumed) {
    return { status: "expired", message: CHALLENGE_EXPIRED };
  }
  await clearChallengeCookie();
  await createSession(challenge.userId, now);
  return { status: "authenticated" };
}

// ── beginTotpEnrollment ───────────────────────────────────────────────────

export async function beginTotpEnrollment(
  now = new Date(),
): Promise<TotpEnrollmentResult> {
  const token = await getChallengeToken();
  if (!token) return { status: "expired", message: CHALLENGE_EXPIRED };

  const challenge = await findValidChallenge(token, "enroll_totp", now);
  if (!challenge) return { status: "expired", message: CHALLENGE_EXPIRED };

  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, challenge.userId))
    .limit(1);

  if (!user) return { status: "expired", message: CHALLENGE_EXPIRED };

  if (challenge.pendingTotpSecretEncrypted) {
    const secret = decryptTotpSecret(challenge.pendingTotpSecretEncrypted);
    const enrollment = createTotpEnrollment(user.name, secret);
    return {
      status: "enroll_totp",
      manualSecret: enrollment.secret,
      uri: enrollment.uri,
    };
  }

  const { secret, uri } = createTotpEnrollment(user.name);
  const encryptedSecret = encryptTotpSecret(secret);

  const stored = await storePendingTotpSecret(
    challenge,
    encryptedSecret,
    now,
  );
  if (!stored) {
    const current = await findValidChallenge(token, "enroll_totp", now);
    if (!current?.pendingTotpSecretEncrypted) {
      return { status: "expired", message: CHALLENGE_EXPIRED };
    }
    const currentSecret = decryptTotpSecret(
      current.pendingTotpSecretEncrypted,
    );
    const currentEnrollment = createTotpEnrollment(user.name, currentSecret);
    return {
      status: "enroll_totp",
      manualSecret: currentEnrollment.secret,
      uri: currentEnrollment.uri,
    };
  }

  return { status: "enroll_totp", manualSecret: secret, uri };
}

// ── completeTotpEnrollment ────────────────────────────────────────────────

export async function completeTotpEnrollment(
  code: string,
  now = new Date(),
): Promise<SetupResult> {
  const token = await getChallengeToken();
  if (!token) return { status: "expired", message: CHALLENGE_EXPIRED };

  const challenge = await findValidChallenge(token, "enroll_totp", now);
  if (!challenge) return { status: "expired", message: CHALLENGE_EXPIRED };

  if (!challenge.pendingTotpSecretEncrypted) {
    return { status: "expired", message: CHALLENGE_EXPIRED };
  }

  const secret = decryptTotpSecret(challenge.pendingTotpSecretEncrypted);
  const totpResult = verifyTotpCode(secret, code, now);

  if (!totpResult.valid) {
    return { status: "invalid", message: INVALID_CODE };
  }

  // Move encrypted secret to user and consume challenge — atomically
  const consumed = await db.transaction(async (tx) => {
    const claimed = await consumeChallenge(challenge, now, tx);
    if (!claimed) return false;

    await tx
      .update(users)
      .set({
        totpSecretEncrypted: challenge.pendingTotpSecretEncrypted,
        totpEnabledAt: now,
        lastTotpCounter: totpResult.counter,
        failedLoginCount: 0,
        lockedUntil: null,
        ...(challenge.pendingPasswordHash
          ? {
              passwordHash: challenge.pendingPasswordHash,
              mustSetPassword: false,
            }
          : {}),
      })
      .where(eq(users.id, challenge.userId));
    return true;
  });

  if (!consumed) {
    return { status: "expired", message: CHALLENGE_EXPIRED };
  }
  await clearChallengeCookie();
  await createSession(challenge.userId, now);
  return { status: "authenticated" };
}

// ── Internal helpers ──────────────────────────────────────────────────────

async function incrementFailedAttempts(
  userId: number,
  currentCount: number,
  now: Date,
): Promise<void> {
  let expectedCount = currentCount;

  for (let attempt = 0; attempt < AUTH_LIMITS.maxFailedAttempts; attempt += 1) {
    const nextCount = expectedCount + 1;
    const updated = await db
      .update(users)
      .set({
        failedLoginCount:
          nextCount >= AUTH_LIMITS.maxFailedAttempts ? 0 : nextCount,
        lockedUntil:
          nextCount >= AUTH_LIMITS.maxFailedAttempts
            ? new Date(now.getTime() + AUTH_LIMITS.lockoutMs)
            : null,
      })
      .where(
        and(
          eq(users.id, userId),
          eq(users.failedLoginCount, expectedCount),
          isNull(users.lockedUntil),
        ),
      )
      .returning({ id: users.id });

    if (updated.length === 1) return;

    const [current] = await db
      .select({
        failedLoginCount: users.failedLoginCount,
        lockedUntil: users.lockedUntil,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!current || (current.lockedUntil && now < current.lockedUntil)) return;
    expectedCount = current.failedLoginCount;
  }

  throw new Error("Could not update failed login count");
}

async function claimTotpCounter(
  userId: number,
  counter: number | null,
  now: Date,
  database: LoginDatabase = db,
): Promise<boolean> {
  if (counter === null) return false;

  const updated = await database
    .update(users)
    .set({
      lastTotpCounter: counter,
      failedLoginCount: 0,
      lockedUntil: null,
    })
    .where(
      and(
        eq(users.id, userId),
        or(isNull(users.lockedUntil), lte(users.lockedUntil, now)),
        or(
          isNull(users.lastTotpCounter),
          lt(users.lastTotpCounter, counter),
        ),
      ),
    )
    .returning({ id: users.id });

  return updated.length === 1;
}

type LoginDatabase = Pick<typeof db, "update">;

class TotpCompletionRace extends Error {}
