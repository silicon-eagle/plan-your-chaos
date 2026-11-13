"use client";

import type { LoginFormState } from "./actions";
import styles from "./login.module.css";

type Props = {
  action: (payload: FormData) => void;
  error?: LoginFormState["error"];
  isPending: boolean;
};

export function TotpLoginForm({ action, error, isPending }: Props) {
  return (
    <form action={action} className={styles.loginForm}>
      <h1 className={styles.heading}>Verification Code</h1>
      <p className={styles.subtitle}>
        Enter the code from your authenticator app.
      </p>
      <div role="status" aria-live="polite" className={styles.errorRegion}>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="code">Verification Code</label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          autoFocus
          className={styles.input}
        />
      </div>
      <input type="hidden" name="_action" value="verify_totp" />
      <button
        type="submit"
        disabled={isPending}
        className={`${styles.submitButton} pixel-border`}
      >
        {isPending ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}
