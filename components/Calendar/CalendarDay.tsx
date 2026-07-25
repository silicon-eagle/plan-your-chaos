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
  eventMarkers?: CalendarEventMarker[];
};

export type CalendarEventMarker = "tim" | "veerle" | "together" | "default";

const markerPaths: Record<CalendarEventMarker, string> = {
  tim: "/icons/eventMarker-tim.png",
  veerle: "/icons/eventMarker-veerle.png",
  together: "/icons/eventMarker-together.png",
  default: "/icons/eventMarker.png",
};

export function CalendarDay({
  day,
  eventMarkers = [],
}: CalendarDayProps) {
  const dateKey = formatDateKey(day.date);
  const label = getDateLabel(day.date);
  const todayLabel = day.isToday ? `${label}, today` : label;
  const eventCount = eventMarkers.length;
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
          <Image
            className={`${styles.marker} ${styles.fallbackMarker}`}
            src={markerPaths.default}
            alt=""
            width={4}
            height={4}
            unoptimized
          />
          {eventMarkers.map((marker, index) => (
            <Image
              className={`${styles.marker} ${styles.eventMarker}`}
              src={markerPaths[marker]}
              alt=""
              width={4}
              height={4}
              unoptimized
              key={`${marker}-${index}`}
            />
          ))}
        </span>
      )}
    </PixelButton>
  );
}
