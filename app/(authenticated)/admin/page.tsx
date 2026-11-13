import { requirePageRole } from "@/lib/auth/authorization";
import { listManagedUsers } from "@/lib/auth/admin-service";
import { AdminUsers } from "./AdminUsers";
import styles from "./admin.module.css";

export default async function AdminPage() {
  const session = await requirePageRole(["Admin"]);
  const users = await listManagedUsers();

  return (
    <main>
      <section className={styles.page} aria-labelledby="admin-heading">
        <h1 id="admin-heading">Manage accounts</h1>
        <p>
          Users can organise events. Readers can view visible events only.
          Account recovery remains administrator-managed.
        </p>
        <AdminUsers users={users} currentUserId={session.user.id} />
      </section>
    </main>
  );
}
