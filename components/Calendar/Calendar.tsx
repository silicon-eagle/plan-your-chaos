"use client";

import { useState } from "react";
import { getMonthCalendar, getMonthLabel } from "@/lib/calendar/utils";
import { CalendarNewButton } from "./CalendarNewButton";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarNavButton } from "./CalendarNavButton";
import { CalendarNowButton } from "./CalendarNowButton";
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

  function goToCurrentMonth() {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <section className={styles.calendar} aria-labelledby="calendar-heading">
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

      <CalendarGrid days={days} />
    </section>
  );
}
