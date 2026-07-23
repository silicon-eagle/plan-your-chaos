import {
  formatDateKey,
  getDateLabel,
  type CalendarDayData,
} from "@/lib/calendar/utils";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import styles from "./CalendarDay.module.css";

type CalendarDayProps = {
  day: CalendarDayData;
};

export function CalendarDay({ day }: CalendarDayProps) {
  const dateKey = formatDateKey(day.date);
  const label = getDateLabel(day.date);

  return (
    <PixelButton
      className={[
        styles.day,
        !day.isCurrentMonth && styles.outsideMonth,
        day.isToday && styles.today,
      ]
        .filter(Boolean)
        .join(" ")}
      href={`/day/${dateKey}`}
      aria-label={day.isToday ? `${label}, today` : label}
      aria-current={day.isToday ? "date" : undefined}
    >
      <time dateTime={dateKey}>{day.date.getDate()}</time>
    </PixelButton>
  );
}
