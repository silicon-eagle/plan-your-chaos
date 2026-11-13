import { and, asc, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { parsePositiveInteger } from "@/app/api/events/validation";
import { db } from "@/db";
import { eventAttendants, events, users } from "@/db/schema";
import { withApiAuthentication } from "@/lib/auth/authorization";
import { USER_ROLE_IDS } from "@/lib/auth/roles";
import type { AuthenticatedSession } from "@/lib/auth/sessions";
import { eventVisibility } from "@/lib/events/visibility";
import {
  logger,
  withDatabaseLogging,
  withRequestLogging,
} from "@/lib/logging/logger";

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

async function getAttendants(
  _request: Request,
  context: RouteContext,
  session: AuthenticatedSession,
) {
  void _request;
  const eventId = await getEventId(context);

  if (!eventId) {
    return errorResponse("Event ID must be a positive integer");
  }

  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eventVisibility(session.user)))
    .limit(1);

  if (!event) {
    return errorResponse("Event not found", 404);
  }

  const attendants = await db
    .select({
      id: users.id,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(eventAttendants)
    .innerJoin(users, eq(eventAttendants.userId, users.id))
    .where(and(
      eq(eventAttendants.eventId, eventId),
      ne(users.roleId, USER_ROLE_IDS.Admin),
    ))
    .orderBy(asc(users.name));

  return NextResponse.json({ attendants });
}

async function addAttendant(
  request: Request,
  context: RouteContext,
  _session: AuthenticatedSession,
) {
  void _session;
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
      createdAt: users.createdAt,
      roleId: users.roleId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return errorResponse("User not found", 404);
  }

  if (user.roleId === USER_ROLE_IDS.Admin) {
    return errorResponse("Admin accounts cannot attend events");
  }

  const [attendance] = await withDatabaseLogging(
    "event_attendant.create",
    { eventId, userId, source: "api" },
    () =>
      db
        .insert(eventAttendants)
        .values({ eventId, userId })
        .onConflictDoNothing()
        .returning(),
  );

  if (!attendance) {
    return errorResponse("User is already an attendant", 409);
  }

  logger.info("event_attendant.created", {
    eventId,
    userId,
    source: "api",
  });
  return NextResponse.json({
    attendant: { id: user.id, name: user.name, createdAt: user.createdAt },
  }, { status: 201 });
}

export const GET = withRequestLogging(
  "GET /api/events/[id]/attendants",
  withApiAuthentication(getAttendants),
);
export const POST = withRequestLogging(
  "POST /api/events/[id]/attendants",
  withApiAuthentication(addAttendant),
);
