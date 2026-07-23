"use client";

import { useState } from "react";
import { getMonthCalendar, getMonthLabel } from "@/lib/calendar/utils";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarNavButton } from "./CalendarNavButton";
import styles from "./Calendar.module.css";

type CalendarProps = {
  initialDate?: Date;
};


export function Calendar({ initialDate = new Date() }: CalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );
  const days = getMonthCalendar(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
  );

  function changeMonth(offset: number) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  return (
    <section className={styles.calendar} aria-labelledby="calendar-heading">
      <header className={styles.header}>
        <CalendarNavButton
          direction="previous"
          onClick={() => changeMonth(-1)}
        />

        <h2 id="calendar-heading">{getMonthLabel(visibleMonth)}</h2>

        <CalendarNavButton
          direction="next"
          onClick={() => changeMonth(1)}
        />
      </header>

      <CalendarGrid days={days} />
    </section>
  );
}
