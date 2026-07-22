import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { parsePositiveInteger } from "@/app/api/events/validation";
import { db } from "@/db";
import { eventAttendants } from "@/db/schema";

type RouteContext = {
  params: Promise<{ id: string; userId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const params = await context.params;
  const eventId = parsePositiveInteger(params.id);
  const userId = parsePositiveInteger(params.userId);

  if (!eventId || !userId) {
    return NextResponse.json(
      { error: "Event and user IDs must be positive integers" },
      { status: 400 },
    );
  }

  const [removedAttendant] = await db
    .delete(eventAttendants)
    .where(
      and(
        eq(eventAttendants.eventId, eventId),
        eq(eventAttendants.userId, userId),
      ),
    )
    .returning({ userId: eventAttendants.userId });

  if (!removedAttendant) {
    return NextResponse.json(
      { error: "Event attendant not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ removedUserId: removedAttendant.userId });
}
