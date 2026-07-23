import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { parsePositiveInteger } from "@/app/api/events/validation";
import { db } from "@/db";
import { eventAttendants, events, users } from "@/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getEventId(context: RouteContext) {
  const { id } = await context.params;
  return parsePositiveInteger(id);
}

export async function GET(_request: Request, context: RouteContext) {
  const eventId = await getEventId(context);

  if (!eventId) {
    return errorResponse("Event ID must be a positive integer");
  }

  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return errorResponse("Event not found", 404);
  }

  const attendants = await db
    .select({
      id: users.id,
      name: users.name,
      avatarPath: users.avatarPath,
      createdAt: users.createdAt,
    })
    .from(eventAttendants)
    .innerJoin(users, eq(eventAttendants.userId, users.id))
    .where(eq(eventAttendants.eventId, eventId))
    .orderBy(asc(users.name));

  return NextResponse.json({ attendants });
}

export async function POST(request: Request, context: RouteContext) {
  const eventId = await getEventId(context);

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

  const userId = parsePositiveInteger(
    (body as Record<string, unknown>).userId,
  );

  if (!userId) {
    return errorResponse("userId is required and must be a positive integer");
  }

  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    return errorResponse("Event not found", 404);
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      avatarPath: users.avatarPath,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return errorResponse("User not found", 404);
  }

  const [attendance] = await db
    .insert(eventAttendants)
    .values({ eventId, userId })
    .onConflictDoNothing()
    .returning();

  if (!attendance) {
    return errorResponse("User is already an attendant", 409);
  }

  return NextResponse.json({ attendant: user }, { status: 201 });
}
