import { and, asc, eq, gt, inArray, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventAttendants, events, users } from "@/db/schema";
import { resolveEventIconId } from "@/lib/events/icons";
import { parseDate, parsePositiveInteger } from "./validation";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  if (!from || !to) {
    return errorResponse("from and to are required and must be valid");
  }

  if (from >= to) {
    return errorResponse("from must be before to");
  }

  const matchingEvents = await db
    .select()
    .from(events)
    .where(
      and(
        lt(events.startsAt, to),
        gt(events.endsAt, from),
      ),
    )
    .orderBy(asc(events.startsAt));

  if (matchingEvents.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const attendanceRows = await db
    .select({
      eventId: eventAttendants.eventId,
      id: users.id,
      name: users.name,
      avatarPath: users.avatarPath,
      createdAt: users.createdAt,
    })
    .from(eventAttendants)
    .innerJoin(users, eq(eventAttendants.userId, users.id))
    .where(
      inArray(
        eventAttendants.eventId,
        matchingEvents.map(({ id }) => id),
      ),
    )
    .orderBy(asc(users.name));

  return NextResponse.json({
    events: matchingEvents.map((event) => ({
      ...event,
      attendants: attendanceRows
        .filter(({ eventId }) => eventId === event.id)
        .map(({ id, name, avatarPath, createdAt }) => ({
          id,
          name,
          avatarPath,
          createdAt,
        })),
    })),
  });
}

export async function POST(request: Request) {
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
  const userId = parsePositiveInteger(input.userId);
  const allDay = input.allDay ?? false;
  const notes = input.notes ?? null;

  if (!title || !startsAt || !endsAt || !userId) {
    return errorResponse(
      "title, startsAt, endsAt, and userId are required and must be valid",
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

  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!owner) {
    return errorResponse("User not found", 404);
  }

  const iconId = await resolveEventIconId(input.iconId);

  if (!iconId) {
    return errorResponse("iconId must reference an existing icon");
  }

  const [createdEvent] = await db
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
    .returning();

  return NextResponse.json({ event: createdEvent }, { status: 201 });
}
