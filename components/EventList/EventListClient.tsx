"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CalendarNewButton } from "@/components/Calendar/CalendarNewButton";
import { EventIconPicker } from "@/components/EventIconPicker/EventIconPicker";
import type { EventIcon as EventIconData } from "@/lib/events/icons";
import { EventListCards, type EventListItem } from "./EventListCards";
import styles from "./EventList.module.css";

export { getEventStatus, type EventListItem } from "./EventListCards";

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

      <EventListCards events={filteredEvents} now={now} />
    </section>
  );
}
