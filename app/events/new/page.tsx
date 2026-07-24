import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getActiveUser } from "@/lib/auth/active-users";
import { formatDateKey, parseDateKey } from "@/lib/calendar/utils";
import { EventForm } from "./EventForm";
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
  const [activeUser, householdUsers] = await Promise.all([
    getActiveUser(),
    db
      .select({
        id: users.id,
        name: users.name,
        avatarPath: users.avatarPath,
      })
      .from(users)
      .orderBy(asc(users.name)),
  ]);

  return (
    <main className={styles.page}>
      <section
        className={`pixel-border ${styles.panel}`}
        aria-labelledby="new-event-heading"
      >
        <h1 id="new-event-heading">Create Event</h1>
        <EventForm
          initialDate={initialDate}
          users={householdUsers}
          activeUserId={activeUser.id}
        />
      </section>
    </main>
  );
}
