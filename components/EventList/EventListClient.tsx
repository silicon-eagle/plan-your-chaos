"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarNewButton } from "@/components/Calendar/CalendarNewButton";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
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
    avatarPath: string | null;
  }[];
};

type EventListClientProps = {
  events: EventListItem[];
  users: {
    id: number;
    name: string;
  }[];
  showCreateButton?: boolean;
  showUpcomingFilter?: boolean;
  showFilters?: boolean;
  compact?: boolean;
  showHeader?: boolean;
  currentTime?: string;
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

export function EventListClient({
  events,
  users,
  showCreateButton = false,
  showUpcomingFilter = false,
  showFilters = true,
  compact = false,
  showHeader = false,
  currentTime = new Date().toISOString(),
}: EventListClientProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [now, setNow] = useState(() => new Date(currentTime));

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const userFilteredEvents =
    selectedUserIds.length === 0
      ? events
      : events.filter((event) =>
          event.attendants.some((attendant) =>
            selectedUserIds.includes(attendant.id),
          ),
        );
  const filteredEvents = upcomingOnly
    ? userFilteredEvents.filter(
        (event) => new Date(event.endsAt) > now,
      )
    : userFilteredEvents;

  function toggleUser(userId: number) {
    setSelectedUserIds((selectedIds) =>
      selectedIds.includes(userId)
        ? selectedIds.filter((id) => id !== userId)
        : [...selectedIds, userId],
    );
  }

  return (
    <section
      className={["pixel-border", styles.eventList, compact && styles.compact]
        .filter(Boolean)
        .join(" ")}
      aria-label="Events"
    >
      {showHeader && (
        <h2 className={styles.heading}>
          <Image
            src="/images/events-header.png"
            alt="Events"
            width={96}
            height={17}
            unoptimized
          />
        </h2>
      )}

      {(showFilters || showCreateButton) && (
        <div className={styles.filterRow}>
          {showFilters && (
            <fieldset className={styles.filters}>
              <legend>Filter by attendee</legend>
              <div className={styles.filterOptions}>
                {users.map((user) => (
                  <label key={user.id}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleUser(user.id)}
                    />
                    <span>{user.name}</span>
                  </label>
                ))}
                {showUpcomingFilter && (
                  <>
                    <span className={styles.filterSeparator} aria-hidden="true">
                      |
                    </span>
                    <label>
                      <input
                        type="checkbox"
                        checked={upcomingOnly}
                        onChange={(event) =>
                          setUpcomingOnly(event.target.checked)
                        }
                      />
                      <span>Upcoming only</span>
                    </label>
                  </>
                )}
              </div>
            </fieldset>
          )}
          {showCreateButton && <CalendarNewButton />}
        </div>
      )}

      <div className={styles.scrollArea}>
        {filteredEvents.length > 0 ? (
          <ol className={styles.items}>
            {filteredEvents.map((event, index) => {
              const colour = index % 2 === 0 ? "yellow" : "purple";
              const startsAt = new Date(event.startsAt);
              const status = getEventStatus(event, now);

              return (
                <li
                  className={`${styles.item} ${styles[colour]}`}
                  key={event.id}
                >
                  <Link href={`/events/${event.id}`}>
                    <span className={styles.stripe} aria-hidden="true" />

                    <span className={styles.iconFrame}>
                      {event.icon && (
                        <Image
                          className={styles.icon}
                          src={`/icons/${colour}/${event.icon.fileName}-${colour}.png`}
                          alt={`${event.icon.name} icon`}
                          width={16}
                          height={16}
                          unoptimized
                        />
                      )}
                    </span>

                    <span className={styles.eventDetails}>
                      <time dateTime={event.startsAt}>
                        {dateFormatter.format(startsAt).toUpperCase()} | {status}
                      </time>
                      <strong>{event.title}</strong>
                      <span>{getTimeLabel(event)}</span>
                    </span>
                    <span
                      className={styles.attendants}
                      aria-label="Attendants"
                    >
                      {event.attendants.map((attendant) => (
                        <span className={styles.attendant} key={attendant.id}>
                          <UserAvatar
                            name={attendant.name}
                            src={attendant.avatarPath}
                          />
                          <span>{attendant.name}</span>
                        </span>
                      ))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className={styles.empty}>No matching events.</p>
        )}
      </div>
    </section>
  );
}
