import { Calendar } from "@/components/Calendar/Calendar";
import { EventList } from "@/components/EventList/EventList";
import styles from "@/app/page.module.css";

type HomeDashboardProps = {
  canEdit: boolean;
  initialDate?: Date;
};

export function HomeDashboard({ canEdit, initialDate }: HomeDashboardProps) {
  const now = new Date();
  const endOfTime = new Date("9999-12-31T23:59:59.999Z");

  return (
    <main className={styles.page}>
      <section className={styles.calendarPanel} aria-label="Calendar">
        <Calendar canEdit={canEdit} initialDate={initialDate} />
      </section>

      <aside className={styles.eventsPanel} aria-label="Upcoming Events">
        <EventList
          from={now}
          to={endOfTime}
          showFilters={false}
          compact
          showHeader
        />
      </aside>
    </main>
  );
}
