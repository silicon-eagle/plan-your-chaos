import { getSession } from "@/lib/auth/authorization";
import { canEditEvents } from "@/lib/auth/roles";
import { AuthenticatedShell } from "@/components/AuthenticatedShell";
import { HomeDashboard } from "@/components/HomeDashboard";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import { parseDateKey } from "@/lib/calendar/utils";
import styles from "./page.module.css";

type HomeProps = {
  searchParams?: Promise<{ date?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps = {}) {
  const session = await getSession();

  if (!session) {
    return (
      <main className={styles.loggedOutPage}>
        <PixelButton href="/login">Login</PixelButton>
      </main>
    );
  }

  const { date } = (await searchParams) ?? {};
  const requestedDate = typeof date === "string" ? parseDateKey(date) : null;

  return (
    <AuthenticatedShell session={session}>
      <HomeDashboard
        canEdit={canEditEvents(session.user.role)}
        initialDate={requestedDate ?? undefined}
      />
    </AuthenticatedShell>
  );
}
