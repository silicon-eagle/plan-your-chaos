import type { CalendarDayData } from "@/lib/calendar/utils";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import styles from "./CalendarDay.module.css";

type CalendarDayProps = {
  day: CalendarDayData;
  isSelected?: boolean;
  onClick?: (date: Date) => void;
};

function getDateTime(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function CalendarDay({
  day,
  isSelected = false,
  onClick,
}: CalendarDayProps) {
  const label = day.date.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <PixelButton
      className={[
        styles.day,
        !day.isCurrentMonth && styles.outsideMonth,
        day.isToday && styles.today,
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      selected={isSelected}
      aria-label={day.isToday ? `${label}, today` : label}
      aria-current={day.isToday ? "date" : undefined}
      onClick={() => onClick?.(day.date)}
    >
      <time dateTime={getDateTime(day.date)}>{day.date.getDate()}</time>
    </PixelButton>
  );
}
