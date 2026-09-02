import { requirePageSession } from "@/lib/auth/authorization";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";

export default async function UserPage() {
  const session = await requirePageSession();
  const { user } = session;

  return (
    <main className="user-page">
      <section className="pixel-border user-panel" aria-labelledby="user-heading">
        <h1 id="user-heading">Account</h1>

        <div className="user-list">
          <div className="user-identity">
            <UserAvatar name={user.name} src={user.avatarPath} decorative />
            <span>{user.name}</span>
          </div>
        </div>

        <section aria-labelledby="security-heading">
          <h2 id="security-heading">Security</h2>
          <p>Password and TOTP required to sign in.</p>
        </section>
      </section>
    </main>
  );
}
