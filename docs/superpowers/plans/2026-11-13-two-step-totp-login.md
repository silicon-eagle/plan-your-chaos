# Two-Step TOTP Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the combined password/TOTP login form with a password-first flow followed by a secure server-backed TOTP verification step.

**Architecture:** Valid username/password authentication creates a short-lived `verify_totp` login challenge for established-TOTP accounts. The second form submits only a TOTP code; the server resolves identity from the opaque challenge cookie and atomically claims the TOTP counter, then consumes the challenge and creates a session, or rotates it to password setup when required.

**Tech Stack:** Next.js Server Actions, React 19, TypeScript, Drizzle ORM, PostgreSQL, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-11-13-two-step-totp-login-design.md`

## Global Constraints

- Keep the password Show/Hide button.
- Do not trust username, user ID, or React state as the second-step identity source.
- Create a session only after successful TOTP verification.
- Preserve existing failed-attempt, lockout, and replay-counter behavior.
- Keep the existing expired-lockout reset and failed-attempt helper unchanged.
- Preserve temporary-password and TOTP-enrollment behavior.
- Do not add dependencies.
- Do not perform commits or any other write-oriented Git operations.

---

### Task 1: Add the `verify_totp` challenge stage

**Files:**
- Modify: `db/schema.ts`
- Modify: `lib/auth/challenges.ts`
- Test: `lib/auth/challenges.test.ts`
- Create: `drizzle/0013_<generated-name>.sql`
- Create: `drizzle/meta/0013_snapshot.json`
- Modify: `drizzle/meta/_journal.json`

**Interfaces:**
- Produces: `LoginChallengeStage = "set_password" | "enroll_totp" | "verify_totp"`
- Produces: `createChallenge(userId, "verify_totp", now)`
- Produces: `findValidChallenge(token, "verify_totp", now)`

- [ ] **Step 1: Write failing challenge-stage tests**

Add tests proving creation and lookup accept the new stage:

```ts
it("creates a verify_totp challenge", async () => {
  dbMocks.update.mockReturnValue(updateChain());
  dbMocks.insert.mockReturnValue(insertChain());

  await createChallenge(1, "verify_totp", baseNow);

  const insertResult = dbMocks.insert.mock.results[0].value;
  expect(insertResult.values.mock.calls[0][0].stage).toBe("verify_totp");
});

it("returns a valid verify_totp challenge", async () => {
  dbMocks.select.mockReturnValue(
    selectReturning([{ ...validChallengeRow, stage: "verify_totp" }]),
  );

  const result = await findValidChallenge("tok", "verify_totp", baseNow);

  expect(result?.stage).toBe("verify_totp");
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
pnpm test -- lib/auth/challenges.test.ts
```

Expected: TypeScript/Vitest fails because `"verify_totp"` is not assignable to the current stage union.

- [ ] **Step 3: Add one shared challenge-stage type**

In `lib/auth/challenges.ts`, define and use:

```ts
export type LoginChallengeStage =
  | "set_password"
  | "enroll_totp"
  | "verify_totp";
```

Replace the repeated two-value unions in `ValidatedChallenge`, `createChallenge`, `findValidChallenge`, and `advanceChallenge` with `LoginChallengeStage`.

In `db/schema.ts`, add the enum value:

```ts
export const loginChallengeStage = pgEnum("login_challenge_stage", [
  "set_password",
  "enroll_totp",
  "verify_totp",
]);
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
pnpm test -- lib/auth/challenges.test.ts
```

Expected: all challenge tests pass.

- [ ] **Step 5: Generate and inspect the migration**

Run:

```bash
pnpm db:generate
```

Verify the generated SQL contains the PostgreSQL enum addition:

```sql
ALTER TYPE "public"."login_challenge_stage" ADD VALUE 'verify_totp';
```

Do not invalidate outstanding password-setup or enrollment challenges at deployment.

Verify `drizzle/meta/_journal.json` contains index `13` and the generated `0013` tag.

---

### Task 2: Split password validation from TOTP completion

**Files:**
- Modify: `lib/auth/login.ts`
- Test: `lib/auth/login.test.ts`

**Interfaces:**
- Consumes: `createChallenge(userId, "verify_totp", now)`
- Consumes: `findValidChallenge(token, "verify_totp", now)`
- Produces:

```ts
export type LoginInput = {
  username: string;
  password: string;
};

export type LoginResult =
  | { status: "verify_totp" }
  | { status: "set_password" }
  | { status: "enroll_totp" }
  | { status: "invalid"; message: string };

export async function completeTotpLogin(
  code: string,
  now?: Date,
): Promise<
  | { status: "authenticated" }
  | { status: "invalid"; message: string }
  | { status: "expired"; message: string }
>;
```

- [ ] **Step 1: Rewrite established-TOTP password-step tests to fail**

Replace combined-login expectations with password-step behavior:

```ts
it("creates a verify_totp challenge after a valid password", async () => {
  dbMocks.select.mockReturnValue(selectReturning([userWithTotp]));
  passwordMocks.verifyPassword.mockResolvedValue(true);

  const result = await beginLogin(
    { username: "Alice", password: "correct" },
    baseNow,
  );

  expect(result).toEqual({ status: "verify_totp" });
  expect(challengeMocks.createChallenge).toHaveBeenCalledWith(
    1,
    "verify_totp",
    baseNow,
  );
  expect(totpMocks.verifyTotpCode).not.toHaveBeenCalled();
  expect(sessionMocks.createSession).not.toHaveBeenCalled();
});
```

Update all `beginLogin` calls to omit `totpCode`. Keep existing wrong-password, lockout, set-password, enrollment, and generic-error assertions.

- [ ] **Step 2: Add failing successful-completion tests**

Add a `verifyTotpChallenge` fixture and tests:

```ts
it("authenticates through a valid verify_totp challenge", async () => {
  cookieMocks.getChallengeToken.mockResolvedValue("challenge-token");
  challengeMocks.findValidChallenge.mockResolvedValue(verifyTotpChallenge);
  dbMocks.select.mockReturnValue(selectReturning([userWithTotp]));
  dbMocks.update.mockReturnValue(updateReturningChain([{ id: 1 }]));

  const result = await completeTotpLogin("123456", baseNow);

  expect(result).toEqual({ status: "authenticated" });
  expect(challengeMocks.consumeChallenge).toHaveBeenCalledWith(
    verifyTotpChallenge,
    baseNow,
    dbMocks,
  );
  expect(cookieMocks.clearChallengeCookie).toHaveBeenCalled();
  expect(sessionMocks.createSession).toHaveBeenCalledWith(1, baseNow);
});
```

Assert the database update sets `lastTotpCounter`, resets `failedLoginCount`, and clears `lockedUntil`.

- [ ] **Step 3: Add failing completion-failure tests**

Cover each behavior independently:

```ts
it("increments failures for an invalid TOTP without consuming the challenge", async () => {
  cookieMocks.getChallengeToken.mockResolvedValue("challenge-token");
  challengeMocks.findValidChallenge.mockResolvedValue(verifyTotpChallenge);
  dbMocks.select.mockReturnValue(selectReturning([userWithTotp]));
  totpMocks.verifyTotpCode.mockReturnValue({ valid: false, counter: null });
  dbMocks.update.mockReturnValue(updateChain());

  const result = await completeTotpLogin("000000", baseNow);

  expect(result).toEqual({
    status: "invalid",
    message: "Invalid credentials.",
  });
  expect(challengeMocks.consumeChallenge).not.toHaveBeenCalled();
  expect(sessionMocks.createSession).not.toHaveBeenCalled();
});
```

Also add cases for:

- missing challenge cookie
- expired or wrong-stage challenge
- missing user
- active account lockout
- account no longer having enrolled TOTP
- replayed counter
- concurrent counter claim returning no row
- challenge consumption losing a race after counter claim, with the transaction rolled back

- [ ] **Step 4: Run the auth tests and verify RED**

Run:

```bash
pnpm test -- lib/auth/login.test.ts
```

Expected: failures show `beginLogin` still requires/verifies `totpCode` and `completeTotpLogin` does not exist.

- [ ] **Step 5: Implement the password-only first step**

Change `beginLogin` so the enrolled-TOTP branch is:

```ts
if (user.totpSecretEncrypted && user.totpEnabledAt) {
  await createChallenge(user.id, "verify_totp", now);
  return { status: "verify_totp" };
}
```

Keep the lockout and password checks before this branch. Check `mustSetPassword` after this branch so enrolled accounts verify TOTP before password setup; accounts without TOTP proceed to password setup or enrollment.

- [ ] **Step 6: Implement atomic TOTP completion**

Add `completeTotpLogin`. It must:

1. read `getChallengeToken()`
2. resolve `findValidChallenge(token, "verify_totp", now)`
3. load the user by `challenge.userId`
4. reject active lockout or missing enrollment
5. verify the TOTP code and reject non-new counters through `incrementFailedAttempts`
6. run one transaction that conditionally updates the user counter/reset fields and then consumes the challenge, or rotates it to `set_password` if required
7. after the transaction succeeds, set the rotated cookie for password setup, or clear the challenge cookie and create the session

Use a transaction-aware counter helper:

```ts
type LoginDatabase = Pick<typeof db, "update">;

async function claimTotpCounter(
  userId: number,
  counter: number | null,
  now: Date,
  database: LoginDatabase = db,
): Promise<boolean> {
  // Conditionally claim the counter only if the lockout is absent or expired.
}
```

The success transaction shape is:

```ts
const completed = await db.transaction(async (tx) => {
  const counterClaimed = await claimTotpCounter(
    challenge.userId,
    totpResult.counter,
    now,
    tx,
  );
  if (!counterClaimed) return false;

  const claimed = user.mustSetPassword
    ? await advanceChallenge(challenge, rotatedPasswordChallenge, now, tx)
    : await consumeChallenge(challenge, now, tx);
  if (!claimed) throw new TotpCompletionRace();
  return true;
});
```

Catch `TotpCompletionRace` to roll back the counter claim. If the counter or challenge claim lost a race, increment failures and return the generic invalid result.

- [ ] **Step 7: Run the auth tests and verify GREEN**

Run:

```bash
pnpm test -- lib/auth/login.test.ts
```

Expected: all login, password-setup, enrollment, replay, and lockout tests pass.

---

### Task 3: Add the dedicated TOTP Server Action and form

**Files:**
- Create: `app/login/TotpLoginForm.tsx`
- Modify: `app/login/actions.ts`
- Modify: `app/login/LoginForm.tsx`
- Test: `app/login/actions.test.ts`
- Test: `app/login/LoginForm.test.tsx`

**Interfaces:**
- Consumes: `completeTotpLogin(code)`
- Produces: `LoginFormState.step = "verify_totp"`
- Produces: `_action=verify_totp`

- [ ] **Step 1: Write failing Server Action tests**

Add `completeTotpLogin` to the auth mock and test the transition:

```ts
it("returns verify_totp after password validation", async () => {
  mocks.beginLogin.mockResolvedValue({ status: "verify_totp" });
  const fd = new FormData();
  fd.set("username", "Admin");
  fd.set("password", "pass");

  const result = await loginAction(fd);

  expect(mocks.beginLogin).toHaveBeenCalledWith({
    username: "Admin",
    password: "pass",
  });
  expect(result).toEqual({ step: "verify_totp" });
});
```

Add `verifyTotpAction` tests:

```ts
it("keeps the verify_totp step after an invalid code", async () => {
  mocks.completeTotpLogin.mockResolvedValue({
    status: "invalid",
    message: "Invalid credentials.",
  });
  const fd = new FormData();
  fd.set("code", "000000");

  const result = await verifyTotpAction(fd);

  expect(result).toEqual({
    step: "verify_totp",
    error: "Invalid credentials.",
  });
});
```

Also verify:

- authenticated result redirects to `/`
- expired result returns `{ error: message }` without `step`
- `loginFlowAction` dispatches `_action=verify_totp`

- [ ] **Step 2: Run action tests and verify RED**

Run:

```bash
pnpm test -- app/login/actions.test.ts
```

Expected: failures because `verify_totp` state and `verifyTotpAction` do not exist.

- [ ] **Step 3: Implement the action transition**

Update the state:

```ts
export type LoginFormState = {
  error?: string;
  step?: "login" | "verify_totp" | "set_password" | "enroll_totp";
  totpQrDataUrl?: string;
  totpManualSecret?: string;
};
```

Dispatch `_action=verify_totp`, remove `totpCode` from `loginAction`, return `{ step: "verify_totp" }` from password validation, and add:

```ts
export async function verifyTotpAction(
  formData: FormData,
): Promise<LoginFormState> {
  const code = String(formData.get("code") ?? "");
  const result = await completeTotpLogin(code);

  if (result.status === "authenticated") {
    redirect("/");
  }
  if (result.status === "expired") {
    return { error: result.message };
  }
  return { step: "verify_totp", error: result.message };
}
```

- [ ] **Step 4: Run action tests and verify GREEN**

Run:

```bash
pnpm test -- app/login/actions.test.ts
```

Expected: all action tests pass.

- [ ] **Step 5: Write failing UI tests**

Replace the initial verification-code expectation:

```ts
it("does not render a verification code on the password step", () => {
  render(<LoginForm />);
  expect(
    screen.queryByLabelText(/verification code/i),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Show password" }),
  ).toBeInTheDocument();
});
```

Mock `useActionState` for second-step state and assert:

```ts
it("renders a dedicated one-time-code form for verify_totp", () => {
  mockedUseActionState.mockReturnValue([
    { step: "verify_totp" },
    vi.fn(),
    false,
  ]);

  render(<LoginForm />);

  const code = screen.getByLabelText("Verification Code");
  expect(code).toHaveAttribute("name", "code");
  expect(code).toHaveAttribute("autocomplete", "one-time-code");
  expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
});
```

- [ ] **Step 6: Run UI tests and verify RED**

Run:

```bash
pnpm test -- app/login/LoginForm.test.tsx
```

Expected: initial form still contains the verification-code field and no second-step component exists.

- [ ] **Step 7: Implement the dedicated form**

Create `TotpLoginForm.tsx`:

```tsx
"use client";

import type { LoginFormState } from "./actions";
import styles from "./login.module.css";

type Props = {
  action: (payload: FormData) => void;
  error?: LoginFormState["error"];
  isPending: boolean;
};

export function TotpLoginForm({ action, error, isPending }: Props) {
  return (
    <form action={action} className={styles.loginForm}>
      <h1 className={styles.heading}>Verification Code</h1>
      <p className={styles.subtitle}>
        Enter the code from your authenticator app.
      </p>
      <div role="status" aria-live="polite" className={styles.errorRegion}>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="code">Verification Code</label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          autoFocus
          className={styles.input}
        />
      </div>
      <input type="hidden" name="_action" value="verify_totp" />
      <button
        type="submit"
        disabled={isPending}
        className={`${styles.submitButton} pixel-border`}
      >
        {isPending ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}
```

Render it in `LoginForm` when `state.step === "verify_totp"` and remove the TOTP field from the initial form. Do not change `PasswordField`.

- [ ] **Step 8: Run UI tests and verify GREEN**

Run:

```bash
pnpm test -- app/login/LoginForm.test.tsx
```

Expected: all login form tests pass, including password Show/Hide preservation.

---

### Task 4: Verify the complete authentication change

**Files:**
- Verify all files modified in Tasks 1-3

**Interfaces:**
- No new interfaces; this task validates the integrated behavior.

- [ ] **Step 1: Run focused authentication tests**

Run:

```bash
pnpm test -- lib/auth/challenges.test.ts lib/auth/login.test.ts app/login/actions.test.ts app/login/LoginForm.test.tsx
```

Expected: all focused tests pass with zero failures.

- [ ] **Step 2: Run the full test suite**

Run:

```bash
pnpm test
```

Expected: all test files pass with zero failures.

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm lint
```

Expected: zero errors. The two known pre-existing warnings may remain:

- unused `_props` in `app/(authenticated)/day/[date]/page.test.tsx`
- raw `<img>` in `app/login/TotpSetupForm.tsx`

- [ ] **Step 4: Run TypeScript checking**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 5: Run the production build**

Run:

```bash
pnpm build
```

Expected: exit code 0.

- [ ] **Step 6: Check patch whitespace**

Run:

```bash
git --no-pager diff --check
```

Expected: no output and exit code 0.
