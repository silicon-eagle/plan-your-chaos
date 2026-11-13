"use client";

import { useActionState } from "react";
import { PixelButton } from "@/components/PixelButton/PixelButton";
import type { ManagedUser } from "@/lib/auth/admin-service";
import { manageUserAction } from "./actions";
import styles from "./admin.module.css";

function RoleOptions() {
  return <><option value="User">User</option><option value="Reader">Reader</option></>;
}

export function AdminUsers({
  users,
  currentUserId,
}: {
  users: ManagedUser[];
  currentUserId: number;
}) {
  const [state, action, pending] = useActionState(manageUserAction, {});

  return (
    <div className={styles.management}>
      <div aria-live="polite" aria-atomic="true">
        {state.error && <p className={styles.feedback} role="alert">{state.error}</p>}
        {state.message && <p className={styles.feedback}>{state.message}</p>}
        {state.temporaryPassword && (
          <div className={styles.feedback}>
            <p>Copy this temporary password now. It cannot be retrieved later.</p>
            <output className={styles.password} aria-label="Temporary password">
              {state.temporaryPassword}
            </output>
            <p>Share it privately, then discard your copy.</p>
          </div>
        )}
      </div>

      {state.signedOut ? (
        <div className={styles.feedback}>
          <p>Your sessions have been invalidated. Save any temporary password above before signing in again.</p>
          <PixelButton href="/login">Sign in again</PixelButton>
        </div>
      ) : (
        <>
          <section className={styles.panel} aria-labelledby="create-heading">
            <h2 id="create-heading">Create account</h2>
            <form action={action} aria-label="Create account">
              <input type="hidden" name="operation" value="create" />
              <fieldset className={styles.fields} disabled={pending}>
                <label className={styles.field}>
                  Name
                  <input className={styles.input} name="name" required maxLength={80} autoComplete="off" />
                </label>
                <label className={styles.field}>
                  Role
                  <select className={styles.input} name="role" defaultValue="User">
                    <RoleOptions />
                  </select>
                </label>
                <PixelButton type="submit">Create account</PixelButton>
              </fieldset>
            </form>
          </section>

          <div className={styles.accounts} aria-busy={pending}>
            {users.map((user) => (
              <article key={user.id} className={styles.panel} aria-labelledby={`account-${user.id}`}>
                <h2 id={`account-${user.id}`}>{user.name}</h2>
                <ul className={styles.status}>
                  <li>Role: {user.role}</li>
                  <li>{!user.hasPassword ? "No password issued" : user.mustSetPassword ? "Password change required" : "Password ready"}</li>
                  <li>{user.hasTotp ? "Authenticator enrolled" : "Authenticator not enrolled"}</li>
                </ul>

                {user.role === "Admin" ? (
                  <p>This Admin account cannot be renamed, demoted, or deleted here.</p>
                ) : (
                  <form action={action} aria-label={`Edit ${user.name}`}>
                    <input type="hidden" name="operation" value="update" />
                    <input type="hidden" name="userId" value={user.id} />
                    <fieldset className={styles.fields} disabled={pending}>
                      <label className={styles.field}>
                        Name
                        <input className={styles.input} name="name" defaultValue={user.name} required maxLength={80} autoComplete="off" />
                      </label>
                      <label className={styles.field}>
                        Role
                        <select className={styles.input} name="role" defaultValue={user.role}>
                          <RoleOptions />
                        </select>
                      </label>
                      <PixelButton type="submit">Save account</PixelButton>
                    </fieldset>
                  </form>
                )}

                <form action={action} aria-label={`Reset authentication for ${user.name}`}>
                  <input type="hidden" name="userId" value={user.id} />
                  <p>Both resets invalidate all sessions and unfinished login setup.</p>
                  {user.id === currentUserId && <p className={styles.warning}>Resetting your own credentials signs you out.</p>}
                  <fieldset className={styles.buttons} disabled={pending}>
                    <PixelButton type="submit" name="operation" value="issue-password">Issue temporary password</PixelButton>
                    <PixelButton type="submit" name="operation" value="reset-totp">Reset authenticator</PixelButton>
                  </fieldset>
                </form>

                {user.role !== "Admin" && (
                  <details className={styles.deletion}>
                    <summary>Delete account</summary>
                    <p id={`delete-warning-${user.id}`} className={styles.warning}>
                      This permanently deletes {user.name} and all events organised by {user.name},
                      as well as their attendance records. This cannot be undone.
                    </p>
                    <form action={action} aria-label={`Delete ${user.name}`}>
                      <input type="hidden" name="operation" value="delete" />
                      <input type="hidden" name="userId" value={user.id} />
                      <fieldset className={styles.fields} disabled={pending}>
                        <label className={styles.field}>
                          Type &quot;{user.name}&quot; to confirm
                          <input className={styles.input} name="confirmation" required autoComplete="off" aria-describedby={`delete-warning-${user.id}`} />
                        </label>
                        <PixelButton type="submit">Permanently delete account</PixelButton>
                      </fieldset>
                    </form>
                  </details>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
