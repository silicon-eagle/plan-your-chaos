import styles from "./login.module.css";

type Props = {
  action: (payload: FormData) => void;
  qrDataUrl: string;
  manualSecret: string;
  error?: string;
  isPending: boolean;
};

export function TotpSetupForm({
  action,
  qrDataUrl,
  manualSecret,
  error,
  isPending,
}: Props) {
  return (
    <form action={action} className={styles.loginForm}>
      <h1 className={styles.heading}>Set Up Two-Factor</h1>
      <p className={styles.subtitle}>
        Scan the QR code with your authenticator app, or enter the secret
        manually.
      </p>

      <div role="status" aria-live="polite" className={styles.errorRegion}>
        {error && <p className={styles.error}>{error}</p>}
      </div>

      <div className={styles.qrContainer}>
        <img
          src={qrDataUrl}
          alt="QR code for authenticator setup"
          className={styles.qrCode}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Manual Secret</span>
        <code className={styles.secret}>{manualSecret}</code>
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
          className={styles.input}
        />
      </div>

      <input type="hidden" name="_action" value="enroll_totp" />

      <button
        type="submit"
        disabled={isPending}
        className={`${styles.submitButton} pixel-border`}
      >
        {isPending ? "Verifying…" : "Verify & Activate"}
      </button>
    </form>
  );
}
