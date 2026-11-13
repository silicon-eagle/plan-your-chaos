"use client";

import { useState } from "react";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import styles from "./login.module.css";

type Props = {
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
};

export function PasswordField({ label, name, autoComplete }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.field}>
      <label htmlFor={name}>{label}</label>
      <div className={styles.passwordControl}>
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={`${styles.input} ${styles.passwordInput}`}
        />
        <PixelButton
          type="button"
          className={styles.passwordVisibilityButton}
          aria-controls={name}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? "Hide" : "Show"}
        </PixelButton>
      </div>
    </div>
  );
}
