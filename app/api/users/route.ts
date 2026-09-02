import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { withApiAuthentication } from "@/lib/auth/authorization";
import type { AuthenticatedSession } from "@/lib/auth/sessions";
import { withRequestLogging } from "@/lib/logging/logger";

async function getUsers() {
  const householdUsers = await db
    .select({
      id: users.id,
      name: users.name,
      avatarPath: users.avatarPath,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.name));

  return NextResponse.json({ users: householdUsers });
}

export const GET = withRequestLogging(
  "GET /api/users",
  withApiAuthentication(async (
    _request: Request,
    _session: AuthenticatedSession,
  ) => {
    void _request;
    void _session;
    return getUsers();
  }),
);
