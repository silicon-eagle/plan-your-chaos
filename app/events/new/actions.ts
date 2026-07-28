"use server";

import { inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { eventAttendants, events, users } from "@/db/schema";
import { getActiveUser } from "@/lib/auth/active-users";
import { parseEventFormData } from "@/lib/events/form-data";
import { resolveEventIconId } from "@/lib/events/icons";
import {
  logger,
  withDatabaseLogging,
} from "@/lib/logging/logger";
import type { EventFormState } from "../form-state";

export async function createEvent(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
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
    notes,
    attendantIds,
    iconId: submittedIconId,
  } = parsed.data;

  const activeUser = await getActiveUser();
  if (attendantIds.length > 0) {
    const selectedUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, attendantIds));

    if (selectedUsers.length !== attendantIds.length) {
      logger.warn("event.create.rejected", {
        reason: "unknown_attendant",
      });
      return { error: "One or more selected attendants no longer exist." };
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
      userId: activeUser.id,
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
            notes,
            userId: activeUser.id,
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
