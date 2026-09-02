import { NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { withApiAuthentication } from "@/lib/auth/authorization";
import type { AuthenticatedSession } from "@/lib/auth/sessions";
import { resolveEventIconId } from "@/lib/events/icons";
import { getEventsInRange } from "@/lib/events/queries";
import {
  logger,
  withDatabaseLogging,
  withRequestLogging,
} from "@/lib/logging/logger";
import { parseDate } from "./validation";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getEvents(
  request: Request,
  _session: AuthenticatedSession,
) {
  void _session;
  const searchParams = new URL(request.url).searchParams;
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  if (!from || !to) {
    return errorResponse("from and to are required and must be valid");
  }

  if (from >= to) {
    return errorResponse("from must be before to");
  }

  return NextResponse.json({ events: await getEventsInRange(from, to) });
}

async function createEvent(
  request: Request,
  session: AuthenticatedSession,
) {
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
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const startsAt = parseDate(input.startsAt);
  const endsAt = parseDate(input.endsAt);
  const userId = session.user.id;
  const allDay = input.allDay ?? false;
  const notes = input.notes ?? null;

  if (!title || !startsAt || !endsAt) {
    return errorResponse(
      "title, startsAt, and endsAt are required and must be valid",
    );
  }

  if (startsAt >= endsAt) {
    return errorResponse("startsAt must be before endsAt");
  }

  if (typeof allDay !== "boolean") {
    return errorResponse("allDay must be a boolean");
  }

  if (notes !== null && typeof notes !== "string") {
    return errorResponse("notes must be a string or null");
  }

  const iconId = await resolveEventIconId(input.iconId);

  if (!iconId) {
    return errorResponse("iconId must reference an existing icon");
  }

  const [createdEvent] = await withDatabaseLogging(
    "event.create",
    { source: "api", userId, iconId },
    () =>
      db
        .insert(events)
        .values({
          title,
          startsAt,
          endsAt,
          allDay,
          userId,
          notes,
          iconId,
        })
        .returning(),
  );

  logger.info("event.created", {
    eventId: createdEvent.id,
    source: "api",
  });
  return NextResponse.json({ event: createdEvent }, { status: 201 });
}

export const GET = withRequestLogging("GET /api/events", withApiAuthentication(getEvents));
export const POST = withRequestLogging("POST /api/events", withApiAuthentication(createEvent));
