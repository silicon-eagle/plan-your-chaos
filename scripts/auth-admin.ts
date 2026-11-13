import "dotenv/config";

import { fileURLToPath } from "node:url";
import { isNotNull, lt, or } from "drizzle-orm";

import { closeDatabase, db } from "@/db/client";
import { loginChallenges, sessions } from "@/db/schema";
import {
  issueTemporaryPassword as issuePassword,
  resetTotp as resetUserTotp,
} from "@/lib/auth/admin-service";
import { logger } from "@/lib/logging/logger";

function parseExactUserArg(
  command: "issue-password" | "reset-totp",
  args: string[],
): string {
  if (args.length !== 2) {
    throw new Error(`${command} requires exactly: --user <name>`);
  }

  const [flag, userName] = args;

  if (
    flag !== "--user" ||
    userName.length === 0 ||
    userName.trim().length === 0 ||
    userName.startsWith("-")
  ) {
    throw new Error(`${command} requires exactly: --user <name>`);
  }

  return userName;
}

export async function issueTemporaryPassword(userName: string): Promise<string> {
  const temporaryPassword = await issuePassword(userName);
  logger.info("auth.admin.issued-temporary-password", { userName });

  return temporaryPassword;
}

export async function resetTotp(userName: string): Promise<void> {
  await resetUserTotp(userName);
  logger.info("auth.admin.reset-totp", { userName });
}

export async function cleanupAuthRecords(now = new Date()): Promise<{
  sessionsDeleted: number;
  challengesDeleted: number;
}> {
  const deletedSessions = await db
    .delete(sessions)
    .where(
      or(
        lt(sessions.absoluteExpiresAt, now),
        lt(sessions.idleExpiresAt, now),
        isNotNull(sessions.revokedAt),
      ),
    )
    .returning({ id: sessions.id });

  const deletedChallenges = await db
    .delete(loginChallenges)
    .where(
      or(
        lt(loginChallenges.expiresAt, now),
        isNotNull(loginChallenges.consumedAt),
      ),
    )
    .returning({ id: loginChallenges.id });

  logger.info("auth.admin.cleanup", {
    sessionsDeleted: deletedSessions.length,
    challengesDeleted: deletedChallenges.length,
  });

  return {
    sessionsDeleted: deletedSessions.length,
    challengesDeleted: deletedChallenges.length,
  };
}

// ── CLI entry point ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;

  try {
    if (command === "issue-password") {
      const userName = parseExactUserArg("issue-password", args);
      const temporaryPassword = await issueTemporaryPassword(userName);
      console.info(`Temporary password for ${userName}: ${temporaryPassword}`);
      console.info("This password will not be shown again.");
    } else if (command === "reset-totp") {
      const userName = parseExactUserArg("reset-totp", args);
      await resetTotp(userName);
    } else if (command === "cleanup") {
      if (args.length > 0) {
        throw new Error("cleanup does not accept extra arguments");
      }
      const result = await cleanupAuthRecords();
      console.info(
        `Cleaned up ${result.sessionsDeleted} sessions and ${result.challengesDeleted} challenges.`,
      );
    } else {
      throw new Error(
        `Unknown command: ${command ?? "(none)"}. Expected: issue-password, reset-totp, cleanup`,
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("An unexpected error occurred.");
    }
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}

export { main };
