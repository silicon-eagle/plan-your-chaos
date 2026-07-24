import type { CalendarDayData } from "@/lib/calendar/utils";
import { CalendarDay } from "./CalendarDay";
import styles from "./CalendarGrid.module.css";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CalendarGridProps = {
  days: CalendarDayData[];
  eventCounts?: Record<string, number>;
};

export function CalendarGrid({
  days,
  eventCounts = {},
}: CalendarGridProps) {
  return (
    <div className={styles.calendar} aria-label="Calendar days">
      <div className={styles.weekdays}>
        {weekdays.map((weekday) => (
          <span key={weekday} aria-hidden="true">
            {weekday}
          </span>
        ))}
      </div>

      <div className={styles.days}>
        {days.map((day) => (
          <CalendarDay
            key={day.date.getTime()}
            day={day}
            eventCount={eventCounts[
              [
                day.date.getFullYear(),
                String(day.date.getMonth() + 1).padStart(2, "0"),
                String(day.date.getDate()).padStart(2, "0"),
              ].join("-")
            ] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
