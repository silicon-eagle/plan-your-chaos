import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getActiveUser } from "@/lib/auth/active-users";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import { UserAvatar } from "@/components/UserAvatar/UserAvatar";
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

        <div className="user-list">
          {householdUsers.map((user) => {
            const isActive = user.id === activeUser.id;

            return (
              <form key={user.id} action={selectActiveUser}>
                <input type="hidden" name="name" value={user.name} />
                <PixelButton
                  className="user-button"
                  type="submit"
                  selected={isActive}
                  disabled={isActive}
                >
                  <span className="user-identity">
                    <UserAvatar
                      name={user.name}
                      src={user.avatarPath}
                      decorative
                    />
                    <span>{user.name}</span>
                  </span>
                  {isActive && <span>[A]</span>}
                </PixelButton>
              </form>
            );
          })}
        </div>
      </section>
    </main>
  );
}
