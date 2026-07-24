"use server";

import { inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { eventAttendants, events, users } from "@/db/schema";
import { getActiveUser } from "@/lib/auth/active-users";

export type CreateEventState = {
  error: string | null;
};

function getRequiredString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getAttendantIds(formData: FormData) {
  const ids = formData.getAll("attendantIds").map((value) => Number(value));

  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    return null;
  }

  return [...new Set(ids)];
}

export async function createEvent(
  _state: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const title = getRequiredString(formData, "title");
  const startsAt = new Date(getRequiredString(formData, "startsAt"));
  const endsAt = new Date(getRequiredString(formData, "endsAt"));
  const notes = getRequiredString(formData, "notes") || null;
  const attendantIds = getAttendantIds(formData);

  if (
    !title ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    !attendantIds
  ) {
    return { error: "Title, start, end, and attendants must be valid." };
  }

  if (startsAt >= endsAt) {
    return { error: "The event must end after it starts." };
  }

  const activeUser = await getActiveUser();
  if (attendantIds.length > 0) {
    const selectedUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, attendantIds));

    if (selectedUsers.length !== attendantIds.length) {
      return { error: "One or more selected attendants no longer exist." };
    }
  }

  const createdEvent = await db.transaction(async (transaction) => {
    const [event] = await transaction
      .insert(events)
      .values({
        title,
        startsAt,
        endsAt,
        allDay: formData.get("allDay") === "on",
        notes,
        userId: activeUser.id,
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
  });

  redirect(`/events/${createdEvent.id}`);
}
