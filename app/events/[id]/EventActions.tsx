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
};

function ActionImages({ name }: { name: "editBtn" | "deleteBtn" }) {
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

export function EventActions({ eventId }: EventActionsProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <div className={styles.eventActions}>
      <Link
        className={buttonStyles.button}
        href={`/events/${eventId}/edit`}
        aria-label="Edit event"
      >
        <ActionImages name="editBtn" />
      </Link>

      {!isConfirmingDelete && (
        <button
          className={buttonStyles.button}
          type="button"
          aria-label="Delete event"
          onClick={() => setIsConfirmingDelete(true)}
        >
          <ActionImages name="deleteBtn" />
        </button>
      )}

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
