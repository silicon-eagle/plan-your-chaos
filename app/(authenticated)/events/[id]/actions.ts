"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { events } from "@/db/schema";
import { parsePositiveInteger } from "@/app/api/events/validation";
import { requireSession } from "@/lib/auth/authorization";
import {
  logger,
  withDatabaseLogging,
} from "@/lib/logging/logger";

export async function deleteEvent(formData: FormData) {
  const eventId = parsePositiveInteger(formData.get("eventId"));

  if (!eventId) {
    throw new Error("A valid event ID is required");
  }

  await requireSession();

  const [deletedEvent] = await withDatabaseLogging(
    "event.delete",
    { eventId },
    () =>
      db
        .delete(events)
        .where(eq(events.id, eventId))
        .returning({ id: events.id }),
  );

  if (!deletedEvent) {
    logger.warn("event.delete.rejected", {
      eventId,
      reason: "not_found",
    });
    throw new Error("The event no longer exists");
  }

  logger.info("event.deleted", { eventId });
  redirect("/");
}
