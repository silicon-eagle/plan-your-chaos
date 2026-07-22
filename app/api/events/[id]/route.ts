import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { parseDate, parsePositiveInteger } from "../validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const eventId = parsePositiveInteger(id);

  if (!eventId) {
    return errorResponse("Event ID must be a positive integer");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON");
    }

    throw error;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("Request body must be an object");
  }

  const [existingEvent] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!existingEvent) {
    return errorResponse("Event not found", 404);
  }

  const input = body as Record<string, unknown>;
  const changes: Partial<typeof events.$inferInsert> = {};

  if ("title" in input) {
    if (typeof input.title !== "string" || !input.title.trim()) {
      return errorResponse("title must be a non-empty string");
    }
    changes.title = input.title.trim();
  }

  if ("startsAt" in input) {
    const startsAt = parseDate(input.startsAt);
    if (!startsAt) {
      return errorResponse("startsAt must be a valid date");
    }
    changes.startsAt = startsAt;
  }

  if ("endsAt" in input) {
    const endsAt = parseDate(input.endsAt);
    if (!endsAt) {
      return errorResponse("endsAt must be a valid date");
    }
    changes.endsAt = endsAt;
  }

  if ("allDay" in input) {
    if (typeof input.allDay !== "boolean") {
      return errorResponse("allDay must be a boolean");
    }
    changes.allDay = input.allDay;
  }

  if ("notes" in input) {
    if (input.notes !== null && typeof input.notes !== "string") {
      return errorResponse("notes must be a string or null");
    }
    changes.notes = input.notes;
  }

  if ("userId" in input) {
    const userId = parsePositiveInteger(input.userId);
    if (!userId) {
      return errorResponse("userId must be a positive integer");
    }

    const [owner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!owner) {
      return errorResponse("User not found", 404);
    }
    changes.userId = userId;
  }

  if (Object.keys(changes).length === 0) {
    return errorResponse("At least one event field must be provided");
  }

  const startsAt = changes.startsAt ?? existingEvent.startsAt;
  const endsAt = changes.endsAt ?? existingEvent.endsAt;

  if (startsAt >= endsAt) {
    return errorResponse("startsAt must be before endsAt");
  }

  const [updatedEvent] = await db
    .update(events)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning();

  return NextResponse.json({ event: updatedEvent });
}

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
