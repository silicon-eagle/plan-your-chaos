import { PixelButton } from "@/components/PixelButton/PixelButton";
import { requirePageRole } from "@/lib/auth/authorization";
import { AdminUserForm } from "../AdminUserForm";
import styles from "../admin.module.css";

export default async function NewAdminUserPage() {
  const session = await requirePageRole(["Admin"]);

  return (
    <main className={styles.page}>
      <section className={`pixel-border ${styles.panel}`} aria-labelledby="create-user-heading">
        <nav aria-label="Account navigation">
          <PixelButton href="/admin" className={styles.linkButton}>
            Back to users
          </PixelButton>
        </nav>
        <h1 id="create-user-heading">Create user</h1>
        <AdminUserForm currentUserId={session.user.id} />
      </section>
    </main>
  );
}
