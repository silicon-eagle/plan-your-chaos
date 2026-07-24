import { EventList } from "@/components/EventList/EventList";
import styles from "./page.module.css";

export default function EventsPage() {
  const beginningOfTime = new Date("0001-01-01T00:00:00.000Z");
  const endOfTime = new Date("9999-12-31T23:59:59.999Z");

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-label="Events">
        <EventList
          from={beginningOfTime}
          to={endOfTime}
          showCreateButton
          showUpcomingFilter
          showHeader
        />
      </section>
    </main>
  );
}
