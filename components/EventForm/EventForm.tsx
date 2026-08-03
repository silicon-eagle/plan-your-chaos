"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
import type { EventIcon } from "@/lib/events/icons";
import type { EventFormState } from "@/app/events/form-state";
import styles from "@/app/events/events.module.css";

type EventFormValues = {
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  notes: string;
  attendantIds: number[];
  iconId: number;
};

type EventFormProps = {
  action: (
    state: EventFormState,
    formData: FormData,
  ) => Promise<EventFormState>;
  initialDate: string;
  users: {
    id: number;
    name: string;
    avatarPath: string | null;
  }[];
  activeUserId: number;
  icons: EventIcon[];
  defaultIconId: number;
  initialValues?: EventFormValues;
  submitLabel?: string;
};

const initialEventFormState: EventFormState = {
  error: null,
};

type DateTimeFieldProps = {
  id: string;
  label: string;
  name: string;
  defaultValue: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

function DateTimeField({
  id,
  label,
  name,
  defaultValue,
  inputRef,
  onChange,
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
          ref={inputRef}
          onChange={onChange}
          required
        />
      </div>
    </div>
  );
}

export function EventForm({
  action,
  initialDate,
  users,
  activeUserId,
  icons,
  defaultIconId,
  initialValues,
  submitLabel = "Create event",
}: EventFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialEventFormState,
  );
  const [selectedIconId, setSelectedIconId] = useState(
    initialValues?.iconId ?? defaultIconId,
  );
  const [isIconGridOpen, setIsIconGridOpen] = useState(false);
  const endDateTimeRef = useRef<HTMLInputElement>(null);
  const selectedIcon =
    icons.find((icon) => icon.id === selectedIconId) ?? icons[0];

  if (!selectedIcon) {
    throw new Error("No event icons are available");
  }

  return (
    <form className={styles.form} action={formAction}>
      <label className={styles.field}>
        <span className={styles.label}>Title</span>
        <input
          className={styles.input}
          name="title"
          defaultValue={initialValues?.title}
          required
        />
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
        defaultValue={initialValues?.startsAt ?? `${initialDate}T09:00`}
        onChange={(event) => {
          const endDate = new Date(event.currentTarget.valueAsNumber);

          if (!Number.isNaN(endDate.getTime()) && endDateTimeRef.current) {
            endDate.setUTCHours(endDate.getUTCHours() + 1);
            endDateTimeRef.current.valueAsNumber = endDate.getTime();
          }
        }}
      />

      <DateTimeField
        id="event-end"
        label="Ends"
        name="endsAt"
        defaultValue={initialValues?.endsAt ?? `${initialDate}T10:00`}
        inputRef={endDateTimeRef}
      />

      <label className={styles.checkbox}>
        <input
          type="checkbox"
          name="allDay"
          defaultChecked={initialValues?.allDay}
        />
        <span>All day</span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Notes</span>
        <textarea
          className={styles.input}
          name="notes"
          defaultValue={initialValues?.notes}
        />
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
                defaultChecked={
                  initialValues
                    ? initialValues.attendantIds.includes(user.id)
                    : user.id === activeUserId
                }
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
        {isPending ? "Saving..." : submitLabel}
      </PixelButton>
    </form>
  );
}
