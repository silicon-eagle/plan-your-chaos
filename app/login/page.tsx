import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/authorization";
import { LoginForm } from "./LoginForm";
import styles from "./login.module.css";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className={styles.loginPage}>
      <LoginForm />
    </main>
  );
}
