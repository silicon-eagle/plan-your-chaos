import { notFound } from "next/navigation";
import { getDateLabel, parseDateKey } from "@/lib/calendar/utils";
import { DayNavigation } from "./DayNavigation";
import styles from "./page.module.css";

type DayPageProps = {
  params: Promise<{ date: string }>;
};

export default async function DayPage({ params }: DayPageProps) {
  const { date: dateKey } = await params;
  const date = parseDateKey(dateKey);

  if (!date) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <DayNavigation date={date} />
        <h1>Welcome to {getDateLabel(date)}</h1>
      </section>
    </main>
  );
}
