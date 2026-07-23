import type { ComponentProps } from "react";
import Image from "next/image";
import styles from "./CalendarNavButton.module.css";

type CalendarNavButtonProps = Omit<
  ComponentProps<"button">,
  "aria-label" | "children"
> & {
  direction: "previous" | "next";
};

const buttonImages = {
  previous: {
    default: "/images/buttons/PrevBtn.png",
    hover: "/images/buttons/PrevBtn-hover.png",
    label: "Previous month",
  },
  next: {
    default: "/images/buttons/NextBtn.png",
    hover: "/images/buttons/NextBtn-hover.png",
    label: "Next month",
  },
} as const;

export function CalendarNavButton({
  direction,
  className,
  ...buttonProps
}: CalendarNavButtonProps) {
  const images = buttonImages[direction];

  return (
    <button
      {...buttonProps}
      className={[styles.button, className].filter(Boolean).join(" ")}
      type="button"
      aria-label={images.label}
    >
      <Image
        className={`${styles.image} ${styles.defaultImage}`}
        src={images.default}
        alt=""
        width={16}
        height={16}
        unoptimized
      />
      <Image
        className={`${styles.image} ${styles.hoverImage}`}
        src={images.hover}
        alt=""
        width={16}
        height={16}
        unoptimized
      />
    </button>
  );
}
