"use client";

import { useActionState } from "react";
import { loginFlowAction, type LoginFormState } from "./actions";
import { PasswordSetupForm } from "./PasswordSetupForm";
import { TotpSetupForm } from "./TotpSetupForm";
import styles from "./login.module.css";

type UserOption = { id: number; name: string };

type Props = {
  users: UserOption[];
};

export function LoginForm({ users }: Props) {
  const [state, dispatch, isPending] = useActionState<LoginFormState, FormData>(
    loginFlowAction,
    {},
  );

  if (state.step === "set_password") {
    return (
      <PasswordSetupForm
        action={dispatch}
        error={state.error}
        isPending={isPending}
      />
    );
  }

  if (
    state.step === "enroll_totp" &&
    state.totpQrDataUrl &&
    state.totpManualSecret
  ) {
    return (
      <TotpSetupForm
        action={dispatch}
        qrDataUrl={state.totpQrDataUrl}
        manualSecret={state.totpManualSecret}
        error={state.error}
        isPending={isPending}
      />
    );
  }

  return (
    <form action={dispatch} className={styles.loginForm}>
      <h1 className={styles.heading}>Login</h1>

      <div role="status" aria-live="polite" className={styles.errorRegion}>
        {state.error && <p className={styles.error}>{state.error}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="userId">Household Member</label>
        <select
          id="userId"
          name="userId"
          required
          className={styles.input}
        >
          <option value="" disabled>
            Select a household member
          </option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="totpCode">Verification Code</label>
        <input
          id="totpCode"
          name="totpCode"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          className={styles.input}
        />
      </div>

      <input type="hidden" name="_action" value="login" />

      <button
        type="submit"
        disabled={isPending}
        className={`${styles.submitButton} pixel-border`}
      >
        {isPending ? "Logging in…" : "Log In"}
      </button>
    </form>
  );
}
