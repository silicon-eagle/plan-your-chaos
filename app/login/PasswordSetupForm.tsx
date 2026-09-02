import styles from "./login.module.css";

type Props = {
  action: (payload: FormData) => void;
  error?: string;
  isPending: boolean;
};

export function PasswordSetupForm({ action, error, isPending }: Props) {
  return (
    <form action={action} className={styles.loginForm}>
      <h1 className={styles.heading}>Set Password</h1>
      <p className={styles.subtitle}>
        Choose a new password to secure your account.
      </p>

      <div role="status" aria-live="polite" className={styles.errorRegion}>
        {error && <p className={styles.error}>{error}</p>}
      </div>

      <div className={styles.field}>
        <label htmlFor="password">New Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={styles.input}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="confirmation">Confirm Password</label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          required
          autoComplete="new-password"
          className={styles.input}
        />
      </div>

      <input type="hidden" name="_action" value="set_password" />

      <button
        type="submit"
        disabled={isPending}
        className={`${styles.submitButton} pixel-border`}
      >
        {isPending ? "Setting…" : "Set Password"}
      </button>
    </form>
  );
}
