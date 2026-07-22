import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getActiveUser } from "@/lib/auth/active-users";
import { selectActiveUser } from "./actions";

export default async function UserPage() {
  const [activeUser, householdUsers] = await Promise.all([
    getActiveUser(),
    db.select().from(users).orderBy(asc(users.name)),
  ]);

  return (
    <main className="user-page">
      <section className="pixel-border user-panel" aria-labelledby="user-heading">
        <h1 id="user-heading">Choose User</h1>
        <p>Currently using Plan Your Chaos as {activeUser.name}.</p>

        <div className="user-list">
          {householdUsers.map((user) => {
            const isActive = user.id === activeUser.id;

            return (
              <form key={user.id} action={selectActiveUser}>
                <input type="hidden" name="name" value={user.name} />
                <button
                  className={`pixel-border pixel-border-interactive user-button${isActive ? " pixel-border-selected" : ""}`}
                  type="submit"
                  aria-pressed={isActive}
                  disabled={isActive}
                >
                  {user.name}
                  {isActive && <span>Active</span>}
                </button>
              </form>
            );
          })}
        </div>
      </section>
    </main>
  );
}
