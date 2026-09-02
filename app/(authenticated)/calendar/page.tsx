import { Calendar } from "@/components/Calendar/Calendar";
import { requirePageSession } from "@/lib/auth/authorization";
import styles from "./page.module.css";

export default async function CalendarPage() {
  await requirePageSession();

  return (
    <main className={styles.page}>
      <section
        className={styles.panel}
        aria-label="Calendar"
      >
        <Calendar />
      </section>
    </main>
  );
}
