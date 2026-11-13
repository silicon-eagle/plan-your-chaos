import { randomBytes } from "node:crypto";
import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { loginChallenges, sessions, userRoles, users } from "@/db/schema";
import { hashPassword } from "./passwords";
import { USER_ROLE_IDS, type UserRole } from "./roles";
import { usernameMatches } from "./usernames";

// Also used by the trusted tsx CLI; do not import Next.js/server-only here.
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type UserTarget = string | number;

export type ManagedUser = {
  id: number;
  name: string;
  role: UserRole;
  hasPassword: boolean;
  mustSetPassword: boolean;
  hasTotp: boolean;
};

export class AdminValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminValidationError";
  }
}

function validateName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) {
    throw new AdminValidationError("Name must contain 1 to 80 characters.");
  }
  return trimmed;
}

function editableRoleId(role: string): number {
  if (role !== "User" && role !== "Reader") {
    throw new AdminValidationError("Choose the User or Reader role.");
  }
  return USER_ROLE_IDS[role];
}

function validateUserId(userId: number) {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new AdminValidationError("Invalid user ID.");
  }
}

function isNameConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "23505" &&
      "constraint" in error &&
      error.constraint === "users_name_case_insensitive_unique") {
    return true;
  }
  return "cause" in error && error.cause !== error && isNameConflict(error.cause);
}

async function handleNameConflict<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isNameConflict(error)) {
      throw new AdminValidationError("A user with that name already exists.");
    }
    throw error;
  }
}

async function lockUser(tx: Transaction, target: UserTarget) {
  if (typeof target === "number") validateUserId(target);
  const [user] = await tx
    .select({ id: users.id, name: users.name, roleId: users.roleId })
    .from(users)
    .where(typeof target === "number" ? eq(users.id, target) : usernameMatches(target))
    .for("update")
    .limit(1);
  if (!user) throw new AdminValidationError(`User not found: ${target}`);
  return user;
}

async function lockAuthenticationUser(tx: Transaction, target: UserTarget) {
  let userId: number;
  if (typeof target === "number") {
    validateUserId(target);
    userId = target;
  } else {
    const [candidate] = await tx.select({ id: users.id })
      .from(users)
      .where(usernameMatches(target))
      .limit(1);
    if (!candidate) throw new AdminValidationError(`User not found: ${target}`);
    userId = candidate.id;
  }

  // Match challenge creation: advisory lock before any user-row lock.
  await tx.execute(sql`select pg_advisory_xact_lock(${userId})`);
  const user = await lockUser(tx, userId);
  if (typeof target === "string" && user.name.toLowerCase() !== target.trim().toLowerCase()) {
    throw new AdminValidationError(`User not found: ${target}`);
  }
  return user;
}

function protectAdmin(roleId: number) {
  if (roleId === USER_ROLE_IDS.Admin) {
    throw new AdminValidationError("Admin accounts cannot be renamed, demoted, or deleted here.");
  }
}

async function invalidateAuthentication(
  tx: Transaction,
  userId: number,
  reason: string,
  now: Date,
) {
  await tx.update(sessions)
    .set({ revokedAt: now, revocationReason: reason })
    .where(eq(sessions.userId, userId));
  await tx.update(loginChallenges)
    .set({ consumedAt: now, pendingPasswordHash: null, pendingTotpSecretEncrypted: null })
    .where(and(eq(loginChallenges.userId, userId), isNull(loginChallenges.consumedAt)));
}

function managedUserQuery() {
  return db.select({
    id: users.id,
    name: users.name,
    role: userRoles.name,
    hasPassword: sql<boolean>`${users.passwordHash} is not null`,
    mustSetPassword: users.mustSetPassword,
    hasTotp: sql<boolean>`${users.totpSecretEncrypted} is not null and ${users.totpEnabledAt} is not null`,
  })
    .from(users)
    .innerJoin(userRoles, eq(users.roleId, userRoles.id));
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  return managedUserQuery().orderBy(asc(users.id));
}

export async function getManagedUser(userId: number): Promise<ManagedUser | undefined> {
  validateUserId(userId);
  const [user] = await managedUserQuery().where(eq(users.id, userId)).limit(1);
  return user;
}

export async function createManagedUser(name: string, role: string) {
  const validName = validateName(name);
  const roleId = editableRoleId(role);
  const temporaryPassword = randomBytes(24).toString("base64url");
  return handleNameConflict(() => db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      name: validName,
      roleId,
      passwordHash: await hashPassword(temporaryPassword),
      mustSetPassword: true,
    }).returning({ id: users.id, name: users.name });
    return { ...user, temporaryPassword };
  }));
}

export async function updateManagedUser(userId: number, name: string, role: string) {
  validateUserId(userId);
  const validName = validateName(name);
  const roleId = editableRoleId(role);
  await handleNameConflict(() => db.transaction(async (tx) => {
    const user = await lockUser(tx, userId);
    protectAdmin(user.roleId);
    await tx.update(users).set({ name: validName, roleId })
      .where(and(eq(users.id, userId), ne(users.roleId, USER_ROLE_IDS.Admin)));
  }));
}

export async function deleteManagedUser(userId: number, confirmation: string) {
  validateUserId(userId);
  await db.transaction(async (tx) => {
    const user = await lockUser(tx, userId);
    protectAdmin(user.roleId);
    if (confirmation.toLowerCase() !== user.name.toLowerCase()) {
      throw new AdminValidationError("Deletion confirmation must match the current account name.");
    }
    await tx.delete(users)
      .where(and(eq(users.id, userId), ne(users.roleId, USER_ROLE_IDS.Admin)));
  });
}

export async function issueTemporaryPassword(target: UserTarget): Promise<string> {
  return db.transaction(async (tx) => {
    const user = await lockAuthenticationUser(tx, target);
    const temporaryPassword = randomBytes(24).toString("base64url");
    const now = new Date();
    await tx.update(users).set({
      passwordHash: await hashPassword(temporaryPassword),
      mustSetPassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
    }).where(eq(users.id, user.id));
    await invalidateAuthentication(tx, user.id, "admin:issue-password", now);
    return temporaryPassword;
  });
}

export async function resetTotp(target: UserTarget): Promise<void> {
  await db.transaction(async (tx) => {
    const user = await lockAuthenticationUser(tx, target);
    const now = new Date();
    await tx.update(users).set({
      totpSecretEncrypted: null,
      totpEnabledAt: null,
      lastTotpCounter: null,
    }).where(eq(users.id, user.id));
    await invalidateAuthentication(tx, user.id, "admin:reset-totp", now);
  });
}
