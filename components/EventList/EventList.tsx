import { asc, ne } from "drizzle-orm";
import { db } from "@/db";
import { icons, users } from "@/db/schema";
import { requireSession } from "@/lib/auth/authorization";
import { canEditEvents, USER_ROLE_IDS } from "@/lib/auth/roles";
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
  showIconFilter?: boolean;
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
  showIconFilter = false,
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

  const session = await requireSession();

  const [events, householdUsers, eventIcons] = await Promise.all([
    getEventsInRange(from, to),
    showFilters
      ? db
          .select({
            id: users.id,
            name: users.name,
          })
          .from(users)
          .where(ne(users.roleId, USER_ROLE_IDS.Admin))
          .orderBy(asc(users.name))
      : Promise.resolve([]),
    showFilters && showIconFilter
      ? db
          .select({
            id: icons.id,
            name: icons.name,
            fileName: icons.fileName,
          })
          .from(icons)
          .orderBy(asc(icons.name))
      : Promise.resolve([]),
  ]);
  const items: EventListItem[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    allDay: event.allDay,
    icon: event.icon,
    attendants: event.attendants.map(({ id, name }) => ({
      id,
      name,
    })),
  }));

  return (
    <EventListClient
      events={items}
      users={householdUsers}
      icons={eventIcons}
      showCreateButton={showCreateButton && canEditEvents(session.user.role)}
      showUpcomingFilter={showUpcomingFilter}
      showIconFilter={showIconFilter}
      showFilters={showFilters}
      compact={compact}
      showHeader={showHeader}
      fillHeight={fillHeight}
      currentTime={new Date().toISOString()}
    />
  );
}
