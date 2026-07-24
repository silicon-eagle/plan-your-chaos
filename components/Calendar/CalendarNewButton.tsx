import Image from "next/image";
import Link from "next/link";
import styles from "./CalendarNavButton.module.css";

export function CalendarNewButton() {
  return (
    <Link
      className={styles.button}
      href="/events/new"
      aria-label="Create event"
    >
      <Image
        className={`${styles.image} ${styles.defaultImage}`}
        src="/images/buttons/newBtn.png"
        alt=""
        width={16}
        height={16}
        unoptimized
      />
      <Image
        className={`${styles.image} ${styles.hoverImage}`}
        src="/images/buttons/newBtn-hover.png"
        alt=""
        width={16}
        height={16}
        unoptimized
      />
    </Link>
  );
}
