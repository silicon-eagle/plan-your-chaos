import {
  formatDateKey,
  type CalendarDayData,
} from "@/lib/calendar/utils";
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
            eventCount={eventCounts[formatDateKey(day.date)] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
