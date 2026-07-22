import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { parsePositiveInteger } from "../validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const eventId = parsePositiveInteger(id);

  if (!eventId) {
    return NextResponse.json(
      { error: "Event ID must be a positive integer" },
      { status: 400 },
    );
  }

  const [deletedEvent] = await db
    .delete(events)
    .where(eq(events.id, eventId))
    .returning({ id: events.id });

  if (!deletedEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ deletedEventId: deletedEvent.id });
}
