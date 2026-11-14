import { UpdateList } from "@/components/UpdateList/UpdateList";
import { requirePageSession } from "@/lib/auth/authorization";
import styles from "../events/page.module.css";

export default async function UpdatesPage() {
  await requirePageSession();

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-label="Updates">
        <UpdateList />
      </section>
    </main>
  );
}
