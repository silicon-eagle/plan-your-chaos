import {
  formatDateKey,
  type CalendarDayData,
} from "@/lib/calendar/utils";
import {
  CalendarDay,
  type CalendarEventMarker,
} from "./CalendarDay";
import styles from "./CalendarGrid.module.css";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CalendarGridProps = {
  days: CalendarDayData[];
  eventMarkers?: Record<string, CalendarEventMarker[]>;
};

export function CalendarGrid({
  days,
  eventMarkers = {},
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
            eventMarkers={eventMarkers[formatDateKey(day.date)]}
          />
        ))}
      </div>
    </div>
  );
}
