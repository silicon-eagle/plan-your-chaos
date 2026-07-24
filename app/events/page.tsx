import Image from "next/image";
import { EventList } from "@/components/EventList/EventList";
import styles from "./page.module.css";

export default function EventsPage() {
  const beginningOfTime = new Date("0001-01-01T00:00:00.000Z");
  const endOfTime = new Date("9999-12-31T23:59:59.999Z");

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="events-heading">
        <header className={styles.header}>
          <h1 id="events-heading">
            <Image
              className={styles.headingImage}
              src="/images/events-header.png"
              alt="Events"
              width={96}
              height={17}
              unoptimized
            />
          </h1>
        </header>
        <EventList
          from={beginningOfTime}
          to={endOfTime}
          showCreateButton
          showUpcomingFilter
        />
      </section>
    </main>
  );
}
