"use server";

import "server-only";

import { asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";

const ACTIVE_USER_COOKIE = "plan-your-chaos-active-user-id";
const COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
  sameSite: "lax" as const,
};

export async function getActiveUser() {
  const cookieStore = await cookies();
  const activeUserId = Number(cookieStore.get(ACTIVE_USER_COOKIE)?.value);

  if (Number.isInteger(activeUserId) && activeUserId > 0) {
    const [activeUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, activeUserId))
      .limit(1);

    if (activeUser) {
      return activeUser;
    }
  }

  const [defaultUser] = await db
    .select()
    .from(users)
    .orderBy(asc(users.name))
    .limit(1);

  if (!defaultUser) {
    throw new Error("No users are available");
  }

  return defaultUser;
}

export async function setActiveUser(name: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.name, name))
    .limit(1);

  if (!user) {
    throw new Error(`User not found: ${name}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_USER_COOKIE, String(user.id), COOKIE_OPTIONS);
  return user;
}
