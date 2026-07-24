import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getEventsInRange } from "@/lib/events/queries";
import {
  EventListClient,
  type EventListItem,
} from "./EventListClient";

type EventListProps = {
  from: Date;
  to: Date;
};

export async function EventList({ from, to }: EventListProps) {
  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    from >= to
  ) {
    throw new RangeError("EventList requires a valid date range");
  }

  const [events, householdUsers] = await Promise.all([
    getEventsInRange(from, to),
    db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .orderBy(asc(users.name)),
  ]);
  const items: EventListItem[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    allDay: event.allDay,
    icon: event.icon,
    attendants: event.attendants.map(({ id, name, avatarPath }) => ({
      id,
      name,
      avatarPath,
    })),
  }));

  return <EventListClient events={items} users={householdUsers} />;
}
