import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/EventForm/EventForm";
import { db } from "@/db";
import { eventAttendants, events, icons, users } from "@/db/schema";
import { parsePositiveInteger } from "@/app/api/events/validation";
import { requirePageSession } from "@/lib/auth/authorization";
import { formatDateKey } from "@/lib/calendar/utils";
import { chooseRandomIcon } from "@/lib/events/icons";
import { updateEvent } from "./actions";
import styles from "../../events.module.css";

type EditEventPageProps = {
  params: Promise<{ id: string }>;
};

function formatDateTimeLocal(date: Date) {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params;
  const eventId = parsePositiveInteger(id);

  if (!eventId) {
    notFound();
  }

  await requirePageSession();

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    notFound();
  }

  const [householdUsers, eventIcons, attendanceRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        avatarPath: users.avatarPath,
      })
      .from(users)
      .orderBy(asc(users.name)),
    db
      .select({
        id: icons.id,
        name: icons.name,
        fileName: icons.fileName,
      })
      .from(icons)
      .orderBy(asc(icons.name)),
    db
      .select({ userId: eventAttendants.userId })
      .from(eventAttendants)
      .where(eq(eventAttendants.eventId, event.id)),
  ]);
  const defaultIconId =
    event.iconId ?? chooseRandomIcon(eventIcons).id;
  const updateEventAction = updateEvent.bind(null, event.id);

  return (
    <main className={styles.page}>
      <section
        className={`pixel-border ${styles.panel}`}
        aria-labelledby="edit-event-heading"
      >
        <h1 id="edit-event-heading">Edit Event</h1>
        <EventForm
          action={updateEventAction}
          initialDate={formatDateKey(event.startsAt)}
          users={householdUsers}
          activeUserId={event.userId}
          icons={eventIcons}
          defaultIconId={defaultIconId}
          initialValues={{
            title: event.title,
            startsAt: formatDateTimeLocal(event.startsAt),
            endsAt: formatDateTimeLocal(event.endsAt),
            allDay: event.allDay,
            notes: event.notes ?? "",
            attendantIds: attendanceRows.map(({ userId }) => userId),
            iconId: defaultIconId,
          }}
          submitLabel="Save event"
        />
      </section>
    </main>
  );
}
