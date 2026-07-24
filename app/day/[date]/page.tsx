import { notFound } from "next/navigation";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import { getDateLabel, parseDateKey } from "@/lib/calendar/utils";

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
    <main>
      <section>
        <h1>Welcome to {getDateLabel(date)}</h1>
        <PixelButton href={`/events/new?date=${dateKey}`}>
          Create event
        </PixelButton>
      </section>
    </main>
  );
}
