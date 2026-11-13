"use server";

import { and, inArray, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { eventAttendants, events, users } from "@/db/schema";
import { requireRole } from "@/lib/auth/authorization";
import { USER_ROLE_IDS } from "@/lib/auth/roles";
import { parseEventFormData } from "@/lib/events/form-data";
import { resolveEventIconId } from "@/lib/events/icons";
import { isEventOwner } from "@/lib/events/owners";
import {
  logger,
  withDatabaseLogging,
} from "@/lib/logging/logger";
import type { EventFormState } from "../form-state";

export async function createEvent(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireRole(["User"]);
  const parsed = parseEventFormData(formData);

  if ("error" in parsed) {
    logger.warn("event.create.rejected", { reason: "invalid_form" });
    return { error: parsed.error };
  }

  const {
    title,
    startsAt,
    endsAt,
    allDay,
    hidden,
    userId,
    notes,
    attendantIds,
    iconId: submittedIconId,
  } = parsed.data;

  if (!(await isEventOwner(userId))) {
    logger.warn("event.create.rejected", { reason: "invalid_owner" });
    return { error: "Select an organiser with the User role." };
  }
  if (attendantIds.length > 0) {
    const selectedUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          inArray(users.id, attendantIds),
          ne(users.roleId, USER_ROLE_IDS.Admin),
        ),
      );

    if (selectedUsers.length !== attendantIds.length) {
      logger.warn("event.create.rejected", {
        reason: "invalid_attendant",
      });
      return { error: "One or more selected attendants no longer exist or cannot attend events." };
    }
  }

  const iconId = await resolveEventIconId(submittedIconId);

  if (!iconId) {
    logger.warn("event.create.rejected", { reason: "invalid_icon" });
    return { error: "Select a valid event icon." };
  }

  const createdEvent = await withDatabaseLogging(
    "event.create",
    {
      userId,
      iconId,
      attendantCount: attendantIds.length,
    },
    () =>
      db.transaction(async (transaction) => {
        const [event] = await transaction
          .insert(events)
          .values({
            title,
            startsAt,
            endsAt,
            allDay,
            hidden,
            notes,
            userId,
            iconId,
          })
          .returning({ id: events.id });

        if (!event) {
          throw new Error("The event could not be created");
        }

        if (attendantIds.length > 0) {
          await transaction.insert(eventAttendants).values(
            attendantIds.map((userId) => ({
              eventId: event.id,
              userId,
            })),
          );
        }

        return event;
      }),
  );

  logger.info("event.created", { eventId: createdEvent.id });
  redirect(`/events/${createdEvent.id}`);
}
