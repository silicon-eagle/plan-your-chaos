import Image from "next/image";
import Link from "next/link";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
import { EventIcon } from "@/components/EventIcon/EventIcon";
import { daysDiff } from "@/lib/calendar/utils";
import styles from "./EventList.module.css";

export type EventListItem = {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  icon: {
    id: number;
    name: string;
    fileName: string;
  } | null;
  attendants: {
    id: number;
    name: string;
  }[];
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Amsterdam",
  weekday: "short",
  day: "2-digit",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Amsterdam",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatEventDate(date: Date) {
  return dateFormatter.format(date).replace(/\bSept\b/, "Sep");
}

function getTimeLabel(event: EventListItem) {
  if (event.allDay) {
    return "All day";
  }

  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);

  return `${timeFormatter.format(startsAt)} - ${timeFormatter.format(endsAt)}`;
}

export function getEventStatus(event: EventListItem, now: Date): string {
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);

  if (now < startsAt) {
    const daysUntil = daysDiff(now, startsAt);

    if (daysUntil === 0) {
      return "Today";
    }

    return `In ${daysUntil} ${daysUntil === 1 ? "day" : "days"}`;
  }

  if (now < endsAt) {
    return "Ongoing";
  }

  return "Past";
}

export type EventUpdate = {
  label: "New" | "Updated";
  timestamp: string;
};

type EventListCardsProps = {
  events: EventListItem[];
  now: Date;
  updates?: Record<number, EventUpdate>;
};

export function EventListCards({ events, now, updates }: EventListCardsProps) {
  return (
    <div className={styles.scrollArea}>
      {events.length > 0 ? (
        <ol className={styles.items}>
          {events.map((event, index) => {
            const colour = index % 2 === 0 ? "yellow" : "purple";
            const startsAt = new Date(event.startsAt);
            const endsAt = new Date(event.endsAt);
            const status = getEventStatus(event, now);
            const isActive = status === "Ongoing";
            const update = updates?.[event.id];

            return (
              <li
                className={[
                  styles.item,
                  styles[colour],
                  isActive && styles.active,
                ].filter(Boolean).join(" ")}
                key={event.id}
              >
                <Link href={`/events/${event.id}`}>
                  {!isActive && (
                    <span className={styles.stripe} aria-hidden="true" />
                  )}
                  <span className={styles.iconFrame}>
                    {event.icon && (
                      <EventIcon
                        className={styles.icon}
                        fileName={event.icon.fileName}
                        colour={colour}
                        label={`${event.icon.name} icon`}
                      />
                    )}
                  </span>
                  <span className={styles.eventDetails}>
                    <time dateTime={event.startsAt}>
                      {formatEventDate(startsAt).toUpperCase()}
                      {daysDiff(startsAt, endsAt) !== 0 &&
                        ` - ${formatEventDate(endsAt).toUpperCase()}`}
                      {" | "}{status}
                    </time>
                    <strong>{event.title}</strong>
                    <span>{getTimeLabel(event)}</span>
                  </span>
                  <span className={styles.attendants} aria-label="Attendants">
                    {event.attendants.map((attendant) => (
                      <span className={styles.attendant} key={attendant.id}>
                        <UserAvatar name={attendant.name} />
                        <span>{attendant.name}</span>
                      </span>
                    ))}
                  </span>
                  {update && (
                    <span className={styles.updateFooter}>
                      <Image
                        className={styles.badge}
                        src={update.label === "New"
                          ? "/images/badge-new.png"
                          : "/images/badge-update.png"}
                        alt={update.label}
                        width={16}
                        height={16}
                        unoptimized
                      />
                      <time
                        className={styles.updateTimestamp}
                        dateTime={update.timestamp}
                      >
                        {update.label === "New" ? "Created" : "Updated"}:{" "}
                        {timeFormatter.format(new Date(update.timestamp))}
                      </time>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={styles.empty}>No matching events.</p>
      )}
    </div>
  );
}
