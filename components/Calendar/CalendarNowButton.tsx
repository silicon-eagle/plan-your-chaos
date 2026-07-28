import type { ComponentProps } from "react";
import Image from "next/image";
import styles from "./CalendarNavButton.module.css";

type CalendarNowButtonProps = Omit<
  ComponentProps<"button">,
  "aria-label" | "children"
>;

export function CalendarNowButton({
  className,
  ...buttonProps
}: CalendarNowButtonProps) {
  return (
    <button
      {...buttonProps}
      className={[styles.button, className].filter(Boolean).join(" ")}
      type="button"
      aria-label="Current month"
    >
      <Image
        className={`${styles.image} ${styles.defaultImage}`}
        src="/images/buttons/currentBtn.png"
        alt=""
        width={16}
        height={16}
        unoptimized
      />
      <Image
        className={`${styles.image} ${styles.hoverImage}`}
        src="/images/buttons/currentBtn-hover.png"
        alt=""
        width={16}
        height={16}
        unoptimized
      />
    </button>
  );
}
