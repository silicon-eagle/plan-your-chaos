"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  EventListCards,
  type EventListItem,
  type EventUpdate,
} from "@/components/EventList/EventListCards";
import styles from "@/components/EventList/EventList.module.css";

export type UpdateListItem = EventListItem & {
  createdAt: string;
  updatedAt: string;
};

type UpdateListClientProps = {
  events: UpdateListItem[];
  currentTime: string;
};

export function UpdateListClient({ events, currentTime }: UpdateListClientProps) {
  const [showNew, setShowNew] = useState(true);
  const [showUpdates, setShowUpdates] = useState(true);
  const [now, setNow] = useState(() => new Date(currentTime));

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredEvents = events
    .filter((event) =>
      event.updatedAt === event.createdAt ? showNew : showUpdates,
    )
    .sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  const updates: Record<number, EventUpdate> = Object.fromEntries(
    filteredEvents.map((event) => [
      event.id,
      event.updatedAt === event.createdAt
        ? { label: "New", timestamp: event.createdAt }
        : { label: "Updated", timestamp: event.updatedAt },
    ]),
  );

  return (
    <section
      className={`pixel-border ${styles.eventList} ${styles.fillHeight}`}
      aria-label="Updates"
    >
      <h2 className={styles.heading}>
        <Image
          src="/images/updates-header.png"
          alt="Updates"
          width={96}
          height={17}
          unoptimized
        />
      </h2>
      <div className={styles.filterRow}>
        <fieldset className={styles.filters}>
          <legend>Filter events</legend>
          <div className={styles.filterOptions}>
            <label>
              <input
                type="checkbox"
                checked={showNew}
                onChange={(event) => setShowNew(event.target.checked)}
              />
              <span>New</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={showUpdates}
                onChange={(event) => setShowUpdates(event.target.checked)}
              />
              <span>Updates</span>
            </label>
          </div>
        </fieldset>
      </div>
      <EventListCards events={filteredEvents} now={now} updates={updates} />
    </section>
  );
}
