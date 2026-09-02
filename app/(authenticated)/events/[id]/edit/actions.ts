"use server";

import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { eventAttendants, events, users } from "@/db/schema";
import { requireSession } from "@/lib/auth/authorization";
import { parseEventFormData } from "@/lib/events/form-data";
import { resolveEventIconId } from "@/lib/events/icons";
import {
  logger,
  withDatabaseLogging,
} from "@/lib/logging/logger";
import type { EventFormState } from "../../form-state";

export async function updateEvent(
  eventId: number,
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const parsed = parseEventFormData(formData);

  if ("error" in parsed) {
    logger.warn("event.update.rejected", {
      eventId,
      reason: "invalid_form",
    });
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

  await requireSession();

  if (attendantIds.length > 0) {
    const selectedUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, attendantIds));

    if (selectedUsers.length !== attendantIds.length) {
      logger.warn("event.update.rejected", {
        eventId,
        reason: "unknown_attendant",
      });
      return { error: "One or more selected attendants no longer exist." };
    }
  }

  const iconId = await resolveEventIconId(submittedIconId);

  if (!iconId) {
    logger.warn("event.update.rejected", {
      eventId,
      reason: "invalid_icon",
    });
    return { error: "Select a valid event icon." };
  }

  const updatedEvent = await withDatabaseLogging(
    "event.update",
    { eventId, iconId, attendantCount: attendantIds.length },
    () =>
      db.transaction(async (transaction) => {
        const [event] = await transaction
          .update(events)
          .set({
            title,
            startsAt,
            endsAt,
            allDay,
            notes,
            iconId,
            updatedAt: new Date(),
          })
          .where(eq(events.id, eventId))
          .returning({ id: events.id });

        if (!event) {
          return null;
        }

        await transaction
          .delete(eventAttendants)
          .where(eq(eventAttendants.eventId, event.id));

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

  if (!updatedEvent) {
    logger.warn("event.update.rejected", {
      eventId,
      reason: "not_found",
    });
    return { error: "The event no longer exists." };
  }

  logger.info("event.updated", { eventId: updatedEvent.id });
  redirect(`/events/${updatedEvent.id}`);
}
