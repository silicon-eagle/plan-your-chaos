import "server-only";

import { and, asc, eq, gt, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendants, events, icons, users } from "@/db/schema";
import { withDatabaseLogging } from "@/lib/logging/logger";

export async function getEventsInRange(from: Date, to: Date) {
  return withDatabaseLogging(
    "events.list",
    { from: from.toISOString(), to: to.toISOString() },
    async () => {
      const matchingEvents = await db
        .select()
        .from(events)
        .where(and(lt(events.startsAt, to), gt(events.endsAt, from)))
        .orderBy(asc(events.startsAt));

      if (matchingEvents.length === 0) {
        return [];
      }

      const iconIds = [
        ...new Set(
          matchingEvents
            .map(({ iconId }) => iconId)
            .filter((iconId): iconId is number => typeof iconId === "number"),
        ),
      ];
      const [attendanceRows, iconRows] = await Promise.all([
        db
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
          .orderBy(asc(users.name)),
        iconIds.length > 0
          ? db
              .select({
                id: icons.id,
                name: icons.name,
                fileName: icons.fileName,
              })
              .from(icons)
              .where(inArray(icons.id, iconIds))
          : Promise.resolve([]),
      ]);

      return matchingEvents.map((event) => ({
        ...event,
        icon: iconRows.find(({ id }) => id === event.iconId) ?? null,
        attendants: attendanceRows
          .filter(({ eventId }) => eventId === event.id)
          .map(({ id, name, avatarPath, createdAt }) => ({
            id,
            name,
            avatarPath,
            createdAt,
          })),
      }));
    },
  );
}
