import { Calendar } from "@/components/Calendar/Calendar";
import styles from "./page.module.css";

export default function CalendarPage() {
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
