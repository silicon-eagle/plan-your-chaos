"use client";

import { useActionState } from "react";
import { loginFlowAction, type LoginFormState } from "./actions";
import { PasswordField } from "./PasswordField";
import { PasswordSetupForm } from "./PasswordSetupForm";
import { TotpSetupForm } from "./TotpSetupForm";
import styles from "./login.module.css";

export function LoginForm() {
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
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className={styles.input}
        />
      </div>

      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
      />

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
