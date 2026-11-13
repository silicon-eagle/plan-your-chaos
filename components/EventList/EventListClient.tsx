"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarNewButton } from "@/components/Calendar/CalendarNewButton";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
import { EventIcon } from "@/components/EventIcon/EventIcon";
import { EventIconPicker } from "@/components/EventIconPicker/EventIconPicker";
import type { EventIcon as EventIconData } from "@/lib/events/icons";
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

type EventListClientProps = {
  events: EventListItem[];
  users: {
    id: number;
    name: string;
  }[];
  icons?: EventIconData[];
  showCreateButton?: boolean;
  showUpcomingFilter?: boolean;
  showIconFilter?: boolean;
  showFilters?: boolean;
  compact?: boolean;
  showHeader?: boolean;
  fillHeight?: boolean;
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

export function EventListClient({
  events,
  users,
  icons = [],
  showCreateButton = false,
  showUpcomingFilter = false,
  showIconFilter = false,
  showFilters = true,
  compact = false,
  showHeader = false,
  fillHeight = false,
  currentTime = new Date().toISOString(),
}: EventListClientProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedIconId, setSelectedIconId] = useState<number | null>(null);
  const [upcomingOnly, setUpcomingOnly] = useState(showUpcomingFilter);
  const [now, setNow] = useState(() => new Date(currentTime));

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredEvents = events.filter(
    (event) =>
      (selectedUserId === "" ||
        event.attendants.some(
          (attendant) => String(attendant.id) === selectedUserId,
        )) &&
      (selectedIconId === null || event.icon?.id === selectedIconId) &&
      (!upcomingOnly || new Date(event.endsAt) > now),
  );

  return (
    <section
      className={[
        "pixel-border",
        styles.eventList,
        compact && styles.compact,
        fillHeight && styles.fillHeight,
      ]
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
              <legend>Filter events</legend>
              <div className={styles.filterOptions}>
                <label className={styles.filterControl}>
                  <span>Attendee</span>
                  <select
                    className={styles.filterSelect}
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                  >
                    <option value="">All</option>
                    {users.map((user) => (
                      <option value={user.id} key={user.id}>{user.name}</option>
                    ))}
                  </select>
                </label>
                {showIconFilter && (
                  <div className={styles.filterControl}>
                    <EventIconPicker
                      id="event-icon-filter"
                      label="Event icon"
                      icons={icons}
                      allowAll
                      floating
                      selectedIconId={selectedIconId}
                      onSelect={setSelectedIconId}
                    />
                  </div>
                )}
                {showUpcomingFilter && (
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
              const endsAt = new Date(event.endsAt);
              const status = getEventStatus(event, now);
              const isActive = status === "Ongoing";

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
                    <span
                      className={styles.attendants}
                      aria-label="Attendants"
                    >
                      {event.attendants.map((attendant) => (
                        <span className={styles.attendant} key={attendant.id}>
                          <UserAvatar
                            name={attendant.name}
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
