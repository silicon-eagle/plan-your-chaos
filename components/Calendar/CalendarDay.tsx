import Image from "next/image";
import {
  formatDateKey,
  getDateLabel,
  type CalendarDayData,
} from "@/lib/calendar/utils";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import styles from "./CalendarDay.module.css";

type CalendarDayProps = {
  day: CalendarDayData;
  eventCount?: number;
};

export function CalendarDay({ day, eventCount = 0 }: CalendarDayProps) {
  const dateKey = formatDateKey(day.date);
  const label = getDateLabel(day.date);
  const todayLabel = day.isToday ? `${label}, today` : label;
  const accessibleLabel =
    eventCount > 0
      ? `${todayLabel}, ${eventCount} ${eventCount === 1 ? "event" : "events"}`
      : todayLabel;

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
      aria-label={accessibleLabel}
      aria-current={day.isToday ? "date" : undefined}
    >
      <time dateTime={dateKey}>{day.date.getDate()}</time>
      {eventCount > 0 && (
        <span className={styles.markers} aria-hidden="true">
          {Array.from({ length: eventCount }, (_, index) => (
            <Image
              className={styles.marker}
              src="/icons/eventMarker.png"
              alt=""
              width={4}
              height={4}
              unoptimized
              key={index}
            />
          ))}
        </span>
      )}
    </PixelButton>
  );
}
