import { getEventsInRange } from "@/lib/events/queries";
import { UpdateListClient, type UpdateListItem } from "./UpdateListClient";

export async function UpdateList() {
  const events = await getEventsInRange(
    new Date("0001-01-01T00:00:00.000Z"),
    new Date("9999-12-31T23:59:59.999Z"),
  );
  const items: UpdateListItem[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    allDay: event.allDay,
    icon: event.icon,
    attendants: event.attendants.map(({ id, name }) => ({ id, name })),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }));

  return (
    <UpdateListClient events={items} currentTime={new Date().toISOString()} />
  );
}
