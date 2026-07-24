"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
import type { EventIcon } from "@/lib/events/icons";
import { createEvent, type CreateEventState } from "./actions";
import styles from "../events.module.css";

type EventFormProps = {
  initialDate: string;
  users: {
    id: number;
    name: string;
    avatarPath: string | null;
  }[];
  activeUserId: number;
  icons: EventIcon[];
  defaultIconId: number;
};

const initialCreateEventState: CreateEventState = {
  error: null,
};

type DateTimeFieldProps = {
  id: string;
  label: string;
  name: string;
  defaultValue: string;
};

function DateTimeField({
  id,
  label,
  name,
  defaultValue,
}: DateTimeFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.dateTimeField}>
        <input
          className={styles.input}
          id={id}
          type="datetime-local"
          name={name}
          defaultValue={defaultValue}
          required
        />
      </div>
    </div>
  );
}

export function EventForm({
  initialDate,
  users,
  activeUserId,
  icons,
  defaultIconId,
}: EventFormProps) {
  const [state, formAction, isPending] = useActionState(
    createEvent,
    initialCreateEventState,
  );
  const [selectedIconId, setSelectedIconId] = useState(defaultIconId);
  const [isIconGridOpen, setIsIconGridOpen] = useState(false);
  const selectedIcon =
    icons.find((icon) => icon.id === selectedIconId) ?? icons[0];

  if (!selectedIcon) {
    throw new Error("No event icons are available");
  }

  return (
    <form className={styles.form} action={formAction}>
      <label className={styles.field}>
        <span className={styles.label}>Title</span>
        <input className={styles.input} name="title" required />
      </label>

      <div className={styles.iconPicker}>
        <span className={styles.label}>Icon</span>
        <div className={styles.iconPickerControls}>
          <Image
            className={styles.eventIcon}
            src={`/icons/yellow/${selectedIcon.fileName}-yellow.png`}
            alt={`${selectedIcon.name} icon`}
            width={16}
            height={16}
            unoptimized
          />
          <PixelButton
            className={styles.iconSelectButton}
            type="button"
            aria-expanded={isIconGridOpen}
            aria-controls="event-icon-grid"
            onClick={() => setIsIconGridOpen((isOpen) => !isOpen)}
          >
            Select icon
          </PixelButton>
        </div>
        <input
          type="hidden"
          name="iconId"
          value={selectedIcon.id}
          readOnly
        />

        {isIconGridOpen && (
          <div
            className={styles.iconGrid}
            id="event-icon-grid"
            aria-label="Event icons"
          >
            {icons.map((icon) => (
              <button
                className={styles.iconOption}
                type="button"
                aria-label={`Select ${icon.name} icon`}
                aria-pressed={icon.id === selectedIcon.id}
                onClick={() => {
                  setSelectedIconId(icon.id);
                  setIsIconGridOpen(false);
                }}
                key={icon.id}
              >
                <Image
                  className={styles.eventIcon}
                  src={`/icons/yellow/${icon.fileName}-yellow.png`}
                  alt=""
                  width={16}
                  height={16}
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <DateTimeField
        id="event-start"
        label="Starts"
        name="startsAt"
        defaultValue={`${initialDate}T09:00`}
      />

      <DateTimeField
        id="event-end"
        label="Ends"
        name="endsAt"
        defaultValue={`${initialDate}T10:00`}
      />

      <label className={styles.checkbox}>
        <input type="checkbox" name="allDay" />
        <span>All day</span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Notes</span>
        <textarea className={styles.input} name="notes" />
      </label>

      <fieldset className={styles.attendants}>
        <legend className={styles.label}>Attendants</legend>
        <div className={styles.attendantList}>
          {users.map((user) => (
            <label className={styles.attendant} key={user.id}>
              <input
                type="checkbox"
                name="attendantIds"
                value={user.id}
                defaultChecked={user.id === activeUserId}
              />
              <UserAvatar
                name={user.name}
                src={user.avatarPath}
                decorative
              />
              <span>{user.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <PixelButton
        className={styles.submit}
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Creating..." : "Create event"}
      </PixelButton>
    </form>
  );
}
