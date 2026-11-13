"use client";

import { useActionState, useRef, useState } from "react";
import { EventIcon } from "@/components/EventIcon/EventIcon";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
import type { EventIcon as EventIconData } from "@/lib/events/icons";
import { USER_ROLE_IDS } from "@/lib/auth/roles";
import type { EventFormState } from "@/app/(authenticated)/events/form-state";
import styles from "@/app/(authenticated)/events/events.module.css";

type EventFormValues = {
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  hidden: boolean;
  userId: number;
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
    roleId: number;
  }[];
  activeUserId: number;
  icons: EventIconData[];
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
  const owners = users.filter((user) => user.roleId === USER_ROLE_IDS.User);
  const initialOwnerId = initialValues?.userId ?? activeUserId;
  const selectedOwnerExists = owners.some(({ id }) => id === initialOwnerId);

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

      <label className={styles.field}>
        <span className={styles.label}>Organiser</span>
        <select
          className={styles.input}
          name="userId"
          defaultValue={selectedOwnerExists ? initialOwnerId : ""}
          required
        >
          <option value="" disabled>Select an organiser</option>
          {owners.map((user) => (
            <option value={user.id} key={user.id}>{user.name}</option>
          ))}
        </select>
      </label>

      <div className={styles.iconPicker}>
        <span className={styles.label}>Icon</span>
        <div className={styles.iconPickerControls}>
          <EventIcon
            className={styles.eventIcon}
            fileName={selectedIcon.fileName}
            label={`${selectedIcon.name} icon`}
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
                <EventIcon
                  className={styles.eventIcon}
                  fileName={icon.fileName}
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

      <label className={styles.checkbox}>
        <input
          type="checkbox"
          name="hidden"
          defaultChecked={initialValues?.hidden}
        />
        <span>Hidden from readers</span>
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
