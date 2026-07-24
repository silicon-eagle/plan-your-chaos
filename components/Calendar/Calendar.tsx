"use client";

import { useEffect, useState } from "react";
import {
  addDays,
  formatDateKey,
  getMonthCalendar,
  getMonthLabel,
} from "@/lib/calendar/utils";
import { CalendarNewButton } from "./CalendarNewButton";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarNavButton } from "./CalendarNavButton";
import { CalendarNowButton } from "./CalendarNowButton";
import styles from "./Calendar.module.css";

type CalendarProps = {
  initialDate?: Date;
};

type CalendarEventRange = {
  startsAt: Date;
  endsAt: Date;
};

export function Calendar({ initialDate = new Date() }: CalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );
  const days = getMonthCalendar(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
  );
  const [eventRanges, setEventRanges] = useState<CalendarEventRange[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const rangeFrom = new Date(
    days[0].date.getFullYear(),
    days[0].date.getMonth(),
    days[0].date.getDate(),
  );
  const lastDay = days.at(-1)!.date;
  const rangeTo = addDays(
    new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate()),
    1,
  );
  const rangeFromValue = rangeFrom.toISOString();
  const rangeToValue = rangeTo.toISOString();
  const eventCounts = Object.fromEntries(
    days.map((day) => {
      const dayStart = new Date(
        day.date.getFullYear(),
        day.date.getMonth(),
        day.date.getDate(),
      );
      const dayEnd = addDays(dayStart, 1);
      const count = eventRanges.filter(
        (event) => event.startsAt < dayEnd && event.endsAt > dayStart,
      ).length;

      return [formatDateKey(day.date), count];
    }),
  );

  useEffect(() => {
    const abortController = new AbortController();

    async function loadEvents() {
      setEventRanges([]);
      setEventsError(null);

      try {
        const searchParams = new URLSearchParams({
          from: rangeFromValue,
          to: rangeToValue,
        });
        const response = await fetch(`/api/events?${searchParams}`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Event request failed with ${response.status}`);
        }

        const body: unknown = await response.json();

        if (
          !body ||
          typeof body !== "object" ||
          !("events" in body) ||
          !Array.isArray(body.events)
        ) {
          throw new Error("Event response has an invalid shape");
        }

        const ranges = body.events.map((event: unknown) => {
          if (
            !event ||
            typeof event !== "object" ||
            !("startsAt" in event) ||
            !("endsAt" in event) ||
            typeof event.startsAt !== "string" ||
            typeof event.endsAt !== "string"
          ) {
            throw new Error("Event response contains an invalid event");
          }

          const startsAt = new Date(event.startsAt);
          const endsAt = new Date(event.endsAt);

          if (
            Number.isNaN(startsAt.getTime()) ||
            Number.isNaN(endsAt.getTime())
          ) {
            throw new Error("Event response contains an invalid date");
          }

          return { startsAt, endsAt };
        });

        setEventRanges(ranges);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setEventsError("Events could not be loaded.");
      }
    }

    void loadEvents();
    return () => abortController.abort();
  }, [rangeFromValue, rangeToValue]);

  function changeMonth(offset: number) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  function goToCurrentMonth() {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <section
      className={`pixel-border ${styles.calendar}`}
      aria-labelledby="calendar-heading"
    >
      <header className={styles.header}>
        <div className={styles.previousActions}>
          <CalendarNavButton
            direction="previous"
            onClick={() => changeMonth(-1)}
          />
          <CalendarNowButton onClick={goToCurrentMonth} />
        </div>

        <h2 id="calendar-heading">{getMonthLabel(visibleMonth)}</h2>

        <div className={styles.headerActions}>
          <CalendarNewButton />
          <CalendarNavButton
            direction="next"
            onClick={() => changeMonth(1)}
          />
        </div>
      </header>

      {eventsError && (
        <p className={styles.error} role="alert">
          {eventsError}
        </p>
      )}
      <CalendarGrid days={days} eventCounts={eventCounts} />
    </section>
  );
}
