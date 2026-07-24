import { asc } from "drizzle-orm";
import { db } from "@/db";
import { icons, users } from "@/db/schema";
import { getActiveUser } from "@/lib/auth/active-users";
import { formatDateKey, parseDateKey } from "@/lib/calendar/utils";
import { chooseRandomIcon } from "@/lib/events/icons";
import { EventForm } from "./EventForm";
import { createEvent } from "./actions";
import styles from "../events.module.css";

type NewEventPageProps = {
  searchParams: Promise<{ date?: string | string[] }>;
};

export default async function NewEventPage({
  searchParams,
}: NewEventPageProps) {
  const { date } = await searchParams;
  const requestedDate = typeof date === "string" ? parseDateKey(date) : null;
  const initialDate = formatDateKey(requestedDate ?? new Date());
  const [activeUser, householdUsers, eventIcons] = await Promise.all([
    getActiveUser(),
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
  ]);
  const defaultIcon = chooseRandomIcon(eventIcons);

  return (
    <main className={styles.page}>
      <section
        className={`pixel-border ${styles.panel}`}
        aria-labelledby="new-event-heading"
      >
        <h1 id="new-event-heading">Create Event</h1>
        <EventForm
          action={createEvent}
          initialDate={initialDate}
          users={householdUsers}
          activeUserId={activeUser.id}
          icons={eventIcons}
          defaultIconId={defaultIcon.id}
        />
      </section>
    </main>
  );
}
