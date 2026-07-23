import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function GET() {
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
