import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireSession } from "@/lib/auth/authorization";
import { getEventsInRange } from "@/lib/events/queries";
import {
  EventListClient,
  type EventListItem,
} from "./EventListClient";

type EventListProps = {
  from: Date;
  to: Date;
  showCreateButton?: boolean;
  showUpcomingFilter?: boolean;
  showFilters?: boolean;
  compact?: boolean;
  showHeader?: boolean;
  fillHeight?: boolean;
};

export async function EventList({
  from,
  to,
  showCreateButton = false,
  showUpcomingFilter = false,
  showFilters = true,
  compact = false,
  showHeader = false,
  fillHeight = false,
}: EventListProps) {
  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    from >= to
  ) {
    throw new RangeError("EventList requires a valid date range");
  }

  await requireSession();

  const [events, householdUsers] = await Promise.all([
    getEventsInRange(from, to),
    showFilters
      ? db
          .select({
            id: users.id,
            name: users.name,
          })
          .from(users)
          .orderBy(asc(users.name))
      : Promise.resolve([]),
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

  return (
    <EventListClient
      events={items}
      users={householdUsers}
      showCreateButton={showCreateButton}
      showUpcomingFilter={showUpcomingFilter}
      showFilters={showFilters}
      compact={compact}
      showHeader={showHeader}
      fillHeight={fillHeight}
      currentTime={new Date().toISOString()}
    />
  );
}
