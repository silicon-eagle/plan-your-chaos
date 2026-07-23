import type { CalendarDayData } from "@/lib/calendar/utils";
import {isSameDay} from "@/lib/calendar/utils"
import { CalendarDay } from "./CalendarDay";
import styles from "./CalendarGrid.module.css";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CalendarGridProps = {
  days: CalendarDayData[];
  selectedDate?: Date | null;
  onDayClick?: (date: Date) => void;
};


export function CalendarGrid({
  days,
  selectedDate,
  onDayClick,
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
            isSelected={
              selectedDate ? isSameDay(day.date, selectedDate) : false
            }
            onClick={onDayClick}
          />
        ))}
      </div>
    </div>
  );
}
