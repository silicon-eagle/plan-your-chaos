"use client";

import { useActionState } from "react";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
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
};

const initialCreateEventState: CreateEventState = {
  error: null,
};

export function EventForm({
  initialDate,
  users,
  activeUserId,
}: EventFormProps) {
  const [state, formAction, isPending] = useActionState(
    createEvent,
    initialCreateEventState,
  );

  return (
    <form className={styles.form} action={formAction}>
      <label className={styles.field}>
        <span className={styles.label}>Title</span>
        <input className={styles.input} name="title" required />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Starts</span>
        <input
          className={styles.input}
          type="datetime-local"
          name="startsAt"
          defaultValue={`${initialDate}T09:00`}
          required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Ends</span>
        <input
          className={styles.input}
          type="datetime-local"
          name="endsAt"
          defaultValue={`${initialDate}T10:00`}
          required
        />
      </label>

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
