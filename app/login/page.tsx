import { asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth/authorization";
import { LoginForm } from "./LoginForm";
import styles from "./login.module.css";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  const userList = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .orderBy(asc(users.name));

  return (
    <main className={styles.loginPage}>
      <LoginForm users={userList} />
    </main>
  );
}
