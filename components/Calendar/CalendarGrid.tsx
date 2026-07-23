import type { CalendarDayData } from "@/lib/calendar/utils";
import { CalendarDay } from "./CalendarDay";
import styles from "./CalendarGrid.module.css";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CalendarGridProps = {
  days: CalendarDayData[];
};

export function CalendarGrid({ days }: CalendarGridProps) {
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
          />
        ))}
      </div>
    </div>
  );
}
