import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { USER_ROLE_IDS } from "@/lib/auth/roles";

export async function isEventOwner(userId: unknown): Promise<boolean> {
  if (typeof userId !== "number" || !Number.isInteger(userId) || userId <= 0) {
    return false;
  }
  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.roleId, USER_ROLE_IDS.User)))
    .limit(1);
  return Boolean(owner);
}
