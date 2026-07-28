import { asc, eq } from "drizzle-orm";
import Image from "next/image";
import { notFound } from "next/navigation";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
import { db } from "@/db";
import { eventAttendants, events, icons, users } from "@/db/schema";
import { parsePositiveInteger } from "@/app/api/events/validation";
import { EventActions } from "./EventActions";
import styles from "../events.module.css";

type EventPageProps = {
  params: Promise<{ id: string }>;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Amsterdam",
  dateStyle: "full",
  timeStyle: "short",
});

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const eventId = parsePositiveInteger(id);

  if (!eventId) {
    notFound();
  }

  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      allDay: events.allDay,
      notes: events.notes,
      ownerName: users.name,
      iconName: icons.name,
      iconFileName: icons.fileName,
    })
    .from(events)
    .innerJoin(users, eq(events.userId, users.id))
    .leftJoin(icons, eq(events.iconId, icons.id))
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    notFound();
  }

  const attendants = await db
    .select({
      id: users.id,
      name: users.name,
      avatarPath: users.avatarPath,
    })
    .from(eventAttendants)
    .innerJoin(users, eq(eventAttendants.userId, users.id))
    .where(eq(eventAttendants.eventId, event.id))
    .orderBy(asc(users.name));

  return (
    <main className={styles.page}>
      <article
        className={`pixel-border ${styles.panel}`}
        aria-labelledby="event-heading"
      >
        <EventActions eventId={event.id} />
        <div className={styles.eventHeading}>
          {event.iconFileName && (
            <Image
              className={styles.eventIcon}
              src={`/icons/yellow/${event.iconFileName}-yellow.png`}
              alt={event.iconName ? `${event.iconName} icon` : ""}
              width={16}
              height={16}
              unoptimized
            />
          )}
          <h1 id="event-heading">{event.title}</h1>
        </div>

        <dl className={styles.details}>
          <div>
            <dt>Starts</dt>
            <dd>
              <time dateTime={event.startsAt.toISOString()}>
                {dateTimeFormatter.format(event.startsAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Ends</dt>
            <dd>
              <time dateTime={event.endsAt.toISOString()}>
                {dateTimeFormatter.format(event.endsAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Organiser</dt>
            <dd>{event.ownerName}</dd>
          </div>
          <div>
            <dt>All day</dt>
            <dd>{event.allDay ? "Yes" : "No"}</dd>
          </div>
        </dl>

        <section aria-labelledby="attendants-heading">
          <h2 id="attendants-heading">Attendants</h2>
          {attendants.length > 0 ? (
            <ul className={styles.attendantList}>
              {attendants.map((attendant) => (
                <li className={styles.attendant} key={attendant.id}>
                  <UserAvatar
                    name={attendant.name}
                    src={attendant.avatarPath}
                    decorative
                  />
                  <span>{attendant.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No attendants selected.</p>
          )}
        </section>

        {event.notes && <p>{event.notes}</p>}
      </article>
    </main>
  );
}
