import { PasswordField } from "./PasswordField";
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

      <PasswordField
        label="New Password"
        name="password"
        autoComplete="new-password"
      />

      <PasswordField
        label="Confirm Password"
        name="confirmation"
        autoComplete="new-password"
      />

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
