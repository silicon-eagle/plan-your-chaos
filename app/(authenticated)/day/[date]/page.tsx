import { notFound } from "next/navigation";
import { EventList } from "@/components/EventList/EventList";
import {
  addDays,
  getDateLabel,
  parseDateKey,
} from "@/lib/calendar/utils";
import { requirePageSession } from "@/lib/auth/authorization";
import { canEditEvents } from "@/lib/auth/roles";
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

  const session = await requirePageSession();

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <DayNavigation date={date} canEdit={canEditEvents(session.user.role)} />
        <h2>{getDateLabel(date)}</h2>
        <EventList from={date} to={addDays(date, 1)} />
      </section>
    </main>
  );
}
