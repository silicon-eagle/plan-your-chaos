import { requirePageRole } from "@/lib/auth/authorization";
import { listManagedUsers } from "@/lib/auth/admin-service";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
import styles from "./admin.module.css";

export default async function AdminPage() {
  await requirePageRole(["Admin"]);
  const users = await listManagedUsers();

  return (
    <main className={styles.page}>
      <section className={`pixel-border ${styles.panel}`} aria-labelledby="admin-heading">
        <div className={styles.heading}>
          <h1 id="admin-heading">Users</h1>
          <PixelButton href="/admin/new" className={styles.linkButton}>
            Create user
          </PixelButton>
        </div>
        <ul className={styles.userList}>
          {users.map((user) => (
            <li key={user.id}>
              <PixelButton href={`/admin/${user.id}`} className={styles.userLink}>
                <span className={styles.identity}>
                  <UserAvatar name={user.name} decorative />
                  <span>{user.name}</span>
                </span>
                <span className={styles.role}>{user.role}</span>
              </PixelButton>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
