import Image from "next/image";
import Link from "next/link";
import { addDays, formatDateKey } from "@/lib/calendar/utils";
import buttonStyles from "@/components/Calendar/CalendarNavButton.module.css";
import styles from "./DayNavigation.module.css";

type DayNavigationProps = {
  date: Date;
  currentDate?: Date;
};

export function DayNavigation({
  date,
  currentDate = new Date(),
}: DayNavigationProps) {
  const dateKey = formatDateKey(date);
  const links = [
    {
      href: `/day/${formatDateKey(addDays(date, -1))}`,
      label: "Previous day",
      image: "prevBtn",
    },
    {
      href: `/day/${formatDateKey(currentDate)}`,
      label: "Current day",
      image: "currentBtn",
    },
    {
      href: `/events/new?date=${dateKey}`,
      label: "Create event",
      image: "newBtn",
    },
    {
      href: `/day/${formatDateKey(addDays(date, 1))}`,
      label: "Next day",
      image: "nextBtn",
    },
  ] as const;

  return (
    <nav className={styles.navigation} aria-label="Day navigation">
      {links.map((link) => (
        <Link
          className={buttonStyles.button}
          href={link.href}
          aria-label={link.label}
          key={link.label}
        >
          <Image
            className={`${buttonStyles.image} ${buttonStyles.defaultImage}`}
            src={`/images/buttons/${link.image}.png`}
            alt=""
            width={16}
            height={16}
            unoptimized
          />
          <Image
            className={`${buttonStyles.image} ${buttonStyles.hoverImage}`}
            src={`/images/buttons/${link.image}-hover.png`}
            alt=""
            width={16}
            height={16}
            unoptimized
          />
        </Link>
      ))}
    </nav>
  );
}
