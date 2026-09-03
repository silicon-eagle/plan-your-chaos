"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import buttonStyles from "@/components/Calendar/CalendarNavButton.module.css";
import { deleteEvent } from "./actions";
import styles from "../events.module.css";

type EventActionsProps = {
  eventId: number;
  previousEventId: number | null;
  nextEventId: number | null;
};

type ActionImageName =
  | "prevBtn"
  | "editBtn"
  | "deleteBtn"
  | "nextBtn"
  | "calendarBtn";

function ActionImages({ name }: { name: ActionImageName }) {
  return (
    <>
      <Image
        className={`${buttonStyles.image} ${buttonStyles.defaultImage}`}
        src={`/images/buttons/${name}.png`}
        alt=""
        width={16}
        height={16}
        unoptimized
      />
      <Image
        className={`${buttonStyles.image} ${buttonStyles.hoverImage}`}
        src={`/images/buttons/${name}-hover.png`}
        alt=""
        width={16}
        height={16}
        unoptimized
      />
    </>
  );
}

export function EventActions({
  eventId,
  previousEventId,
  nextEventId,
}: EventActionsProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <div className={styles.eventActions}>
      {previousEventId && (
        <Link
          className={buttonStyles.button}
          href={`/events/${previousEventId}`}
          aria-label="Previous event"
        >
          <ActionImages name="prevBtn" />
        </Link>
      )}

      <Link
        className={buttonStyles.button}
        href={`/events/${eventId}/edit`}
        aria-label="Edit event"
      >
        <ActionImages name="editBtn" />
      </Link>

      <button
        className={buttonStyles.button}
        type="button"
        aria-label="Delete event"
        onClick={() => setIsConfirmingDelete(true)}
      >
        <ActionImages name="deleteBtn" />
      </button>

      {nextEventId && (
        <Link
          className={buttonStyles.button}
          href={`/events/${nextEventId}`}
          aria-label="Next event"
        >
          <ActionImages name="nextBtn" />
        </Link>
      )}

      <Link
        className={buttonStyles.button}
        href="/"
        aria-label="Calendar"
      >
        <ActionImages name="calendarBtn" />
      </Link>

      {isConfirmingDelete && (
        <div
          className={`pixel-border ${styles.deleteConfirmation}`}
          role="alertdialog"
          aria-label="Confirm deletion"
        >
          <p>Delete this event?</p>
          <form action={deleteEvent}>
            <input type="hidden" name="eventId" value={eventId} />
            <div className={styles.confirmationActions}>
              <PixelButton type="submit">Delete</PixelButton>
              <PixelButton
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </PixelButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
