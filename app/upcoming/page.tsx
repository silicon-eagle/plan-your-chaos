import { EventList } from "@/components/EventList/EventList";
import styles from "./page.module.css";

export default function UpcomingEventsPage() {
  const now = new Date();
  const endOfTime = new Date("9999-12-31T23:59:59.999Z");

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="upcoming-heading">
        <h1 id="upcoming-heading">Upcoming Events</h1>
        <EventList from={now} to={endOfTime} />
      </section>
    </main>
  );
}
