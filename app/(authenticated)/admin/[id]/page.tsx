import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { parsePositiveInteger } from "@/app/api/events/validation";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
import { db } from "@/db";
import { icons } from "@/db/schema";
import { requirePageRole } from "@/lib/auth/authorization";
import { getManagedUser } from "@/lib/auth/admin-service";
import { AdminUserForm } from "../AdminUserForm";
import styles from "../admin.module.css";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserPage({ params }: Props) {
  const session = await requirePageRole(["Admin"]);
  const userId = parsePositiveInteger((await params).id);
  if (!userId) notFound();

  const [user, eventIcons] = await Promise.all([
    getManagedUser(userId),
    db
      .select({
        id: icons.id,
        name: icons.name,
        fileName: icons.fileName,
      })
      .from(icons)
      .orderBy(asc(icons.name)),
  ]);
  if (!user) notFound();

  return (
    <main className={styles.page}>
      <section className={`pixel-border ${styles.panel}`} aria-labelledby="user-heading">
        <nav aria-label="Account navigation">
          <PixelButton href="/admin" className={styles.linkButton}>
            Back to users
          </PixelButton>
        </nav>
        <div className={styles.identity}>
          <UserAvatar name={user.name} decorative />
          <h1 id="user-heading">{user.name}</h1>
        </div>
        <AdminUserForm
          key={user.id}
          user={user}
          currentUserId={session.user.id}
          icons={eventIcons}
        />
      </section>
    </main>
  );
}
