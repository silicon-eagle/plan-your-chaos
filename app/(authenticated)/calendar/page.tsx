import { Calendar } from "@/components/Calendar/Calendar";
import { requirePageSession } from "@/lib/auth/authorization";
import { canEditEvents } from "@/lib/auth/roles";
import styles from "./page.module.css";

export default async function CalendarPage() {
  const session = await requirePageSession();

  return (
    <main className={styles.page}>
      <section
        className={styles.panel}
        aria-label="Calendar"
      >
        <Calendar canEdit={canEditEvents(session.user.role)} />
      </section>
    </main>
  );
}
