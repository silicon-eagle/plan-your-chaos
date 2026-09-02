import { getSession } from "@/lib/auth/authorization";
import { AuthenticatedShell } from "@/components/AuthenticatedShell";
import { HomeDashboard } from "@/components/HomeDashboard";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import styles from "./page.module.css";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    return (
      <main className={styles.loggedOutPage}>
        <PixelButton href="/login">Login</PixelButton>
      </main>
    );
  }

  return (
    <AuthenticatedShell session={session}>
      <HomeDashboard />
    </AuthenticatedShell>
  );
}
