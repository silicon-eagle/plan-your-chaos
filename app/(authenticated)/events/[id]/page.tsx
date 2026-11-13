import { and, asc, desc, eq, gt, lt, ne, or } from "drizzle-orm";
import { EventIcon } from "@/components/EventIcon/EventIcon";
import { notFound } from "next/navigation";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
import { db } from "@/db";
import { eventAttendants, events, icons, users } from "@/db/schema";
import { parsePositiveInteger } from "@/app/api/events/validation";
import { requirePageSession } from "@/lib/auth/authorization";
import { canEditEvents, USER_ROLE_IDS, type UserRole } from "@/lib/auth/roles";
import { eventVisibility } from "@/lib/events/queries";
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

async function getNextEvent(eventId: number, startsAt: Date, role: UserRole) {
  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eventVisibility(role),
        or(
          gt(events.startsAt, startsAt),
          and(eq(events.startsAt, startsAt), gt(events.id, eventId)),
        ),
      ),
    )
    .orderBy(asc(events.startsAt), asc(events.id))
    .limit(1);

  return event?.id ?? null;
}

async function getPrevEvent(eventId: number, startsAt: Date, role: UserRole) {
  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eventVisibility(role),
        or(
          lt(events.startsAt, startsAt),
          and(eq(events.startsAt, startsAt), lt(events.id, eventId)),
        ),
      ),
    )
    .orderBy(desc(events.startsAt), desc(events.id))
    .limit(1);

  return event?.id ?? null;
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const eventId = parsePositiveInteger(id);

  if (!eventId) {
    notFound();
  }

  const session = await requirePageSession();

  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      allDay: events.allDay,
      hidden: events.hidden,
      notes: events.notes,
      ownerName: users.name,
      iconName: icons.name,
      iconFileName: icons.fileName,
    })
    .from(events)
    .innerJoin(users, eq(events.userId, users.id))
    .leftJoin(icons, eq(events.iconId, icons.id))
    .where(and(eq(events.id, eventId), eventVisibility(session.user.role)))
    .limit(1);

  if (!event) {
    notFound();
  }

  const [attendants, previousEventId, nextEventId] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(eventAttendants)
      .innerJoin(users, eq(eventAttendants.userId, users.id))
      .where(and(
        eq(eventAttendants.eventId, event.id),
        ne(users.roleId, USER_ROLE_IDS.Admin),
      ))
      .orderBy(asc(users.name)),
    getPrevEvent(event.id, event.startsAt, session.user.role),
    getNextEvent(event.id, event.startsAt, session.user.role),
  ]);

  return (
    <main className={styles.page}>
      <article
        className={`pixel-border ${styles.panel}`}
        aria-labelledby="event-heading"
      >
        <EventActions
          eventId={event.id}
          previousEventId={previousEventId}
          nextEventId={nextEventId}
          canEdit={canEditEvents(session.user.role)}
        />
        <div className={styles.eventHeading}>
          {event.iconFileName && (
            <EventIcon
              className={styles.eventIcon}
              fileName={event.iconFileName}
              label={event.iconName ? `${event.iconName} icon` : undefined}
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
          {event.hidden && (
            <div>
              <dt>Visibility</dt>
              <dd>Hidden from readers</dd>
            </div>
          )}
        </dl>

        <section aria-labelledby="attendants-heading">
          <h2 id="attendants-heading">Attendants</h2>
          {attendants.length > 0 ? (
            <ul className={styles.attendantList}>
              {attendants.map((attendant) => (
                <li className={styles.attendant} key={attendant.id}>
                  <UserAvatar
                    name={attendant.name}
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
