import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { withApiAuthentication } from "@/lib/auth/authorization";
import type { AuthenticatedSession } from "@/lib/auth/sessions";
import {
  logger,
  withDatabaseLogging,
  withRequestLogging,
} from "@/lib/logging/logger";
import { parseDate, parsePositiveInteger } from "../validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function updateEvent(
  request: Request,
  context: RouteContext,
  _session: AuthenticatedSession,
) {
  void _session;
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

  const input = body as Record<string, unknown>;

  if ("userId" in input) {
    return errorResponse("userId cannot be changed");
  }

  const [existingEvent] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!existingEvent) {
    return errorResponse("Event not found", 404);
  }

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

  if (Object.keys(changes).length === 0) {
    return errorResponse("At least one event field must be provided");
  }

  const startsAt = changes.startsAt ?? existingEvent.startsAt;
  const endsAt = changes.endsAt ?? existingEvent.endsAt;

  if (startsAt >= endsAt) {
    return errorResponse("startsAt must be before endsAt");
  }

  const [updatedEvent] = await withDatabaseLogging(
    "event.update",
    { eventId, source: "api" },
    () =>
      db
        .update(events)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(events.id, eventId))
        .returning(),
  );

  if (!updatedEvent) {
    return errorResponse("Event not found", 404);
  }

  logger.info("event.updated", { eventId, source: "api" });
  return NextResponse.json({ event: updatedEvent });
}

async function deleteEvent(
  _request: Request,
  context: RouteContext,
  _session: AuthenticatedSession,
) {
  void _session;
  const { id } = await context.params;
  const eventId = parsePositiveInteger(id);

  if (!eventId) {
    return NextResponse.json(
      { error: "Event ID must be a positive integer" },
      { status: 400 },
    );
  }

  const [deletedEvent] = await withDatabaseLogging(
    "event.delete",
    { eventId, source: "api" },
    () =>
      db
        .delete(events)
        .where(eq(events.id, eventId))
        .returning({ id: events.id }),
  );

  if (!deletedEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  logger.info("event.deleted", { eventId, source: "api" });
  return NextResponse.json({ deletedEventId: deletedEvent.id });
}

export const PATCH = withRequestLogging(
  "PATCH /api/events/[id]",
  withApiAuthentication(updateEvent),
);
export const DELETE = withRequestLogging(
  "DELETE /api/events/[id]",
  withApiAuthentication(deleteEvent),
);
