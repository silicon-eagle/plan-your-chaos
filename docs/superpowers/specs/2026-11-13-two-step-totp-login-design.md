# Two-Step TOTP Login Design

## Goal

Split authentication for accounts with an enrolled authenticator into two screens:

1. username and password
2. TOTP verification code

Keep the password Show/Hide button and make the dedicated TOTP input available to password managers through `autocomplete="one-time-code"`.

## Required Behavior

- The initial login form contains username and password only.
- A correct password for an account with enrolled TOTP creates a short-lived server-side `verify_totp` challenge and displays the verification-code form.
- The browser receives only the opaque challenge cookie. User identity is not submitted by the second form or trusted from React state.
- A session is created only after successful TOTP verification and any required password setup.
- Invalid passwords retain the existing generic credentials error and failed-attempt behavior.
- Invalid, replayed, or concurrently claimed TOTP codes retain the existing failed-attempt and lockout behavior.
- Expired, consumed, missing, or wrong-stage challenges return to the login form with a challenge-expired error.
- Temporary-password and TOTP-enrollment flows retain their current behavior.

## Challenge Model

Add `verify_totp` to the PostgreSQL `login_challenge_stage` enum and its TypeScript types.

After a valid password:

- an established-TOTP account creates a `verify_totp` challenge
- an account without enrolled TOTP that requires a password change creates the existing `set_password` challenge
- an account without TOTP creates the existing `enroll_totp` challenge

Challenge creation continues to invalidate the user's other active challenges under the existing PostgreSQL advisory lock. Creating a new password-validated challenge therefore replaces an earlier pending second step for the same account.

## TOTP Completion

`completeTotpLogin(code)` reads the challenge token from the secure cookie and resolves a valid `verify_totp` challenge server-side. It then loads the challenge's user and rechecks account lockout and TOTP enrollment state.

For an invalid or replayed code, increment the same account failure counter used by password failures and do not consume the challenge. If the threshold is reached, apply the existing lockout.

For a valid code, one database transaction must:

- conditionally claim a counter newer than `last_totp_counter`
- reset `failed_login_count` and `locked_until`
- atomically consume the challenge, or rotate and advance it to `set_password` if a password change is required

If either claim fails, authentication fails and no session is created. After a successful transaction, either set the rotated challenge cookie for password setup, or clear the challenge cookie and create the authenticated session.

## Server Actions

Add `verify_totp` to `LoginFormState.step` and route `_action=verify_totp` to a dedicated action.

- `loginAction` reads only username and password.
- A `verify_totp` result renders the dedicated second step.
- `verifyTotpAction` reads only the verification code.
- Successful completion redirects to `/`, or renders password setup when required.
- Invalid code keeps the user on the TOTP step with an error.
- An expired challenge returns the normal login step with the expiration error.

## User Interface

The initial form preserves:

- username with `autocomplete="username"`
- password with `autocomplete="current-password"`
- the existing Show/Hide button

It removes the verification-code field.

The second form contains:

- a **Verification Code** input
- numeric input mode
- `autocomplete="one-time-code"`
- an explicit hidden `_action=verify_totp`
- a submit button with pending state
- the existing accessible live error region

No username or account ID is included in the second form.

## Migration

Create a new Drizzle migration that runs:

```sql
ALTER TYPE "public"."login_challenge_stage" ADD VALUE 'verify_totp';
```

Existing password-setup and enrollment challenges remain valid until their normal expiration or consumption.

Update the migration journal and schema snapshot through the repository's existing Drizzle generation command.

## Testing

Add focused regression coverage for:

- initial login accepting username/password without a TOTP code
- established-TOTP accounts returning `verify_totp` and creating the matching challenge
- no TOTP verification or session creation during the password step
- valid challenge/code consuming the challenge, claiming the counter, and creating a session
- invalid, replayed, and concurrently claimed codes incrementing failures without creating a session
- locked, expired, missing-user, missing-enrollment, and wrong-stage challenges failing safely
- action transition from password step to TOTP step
- TOTP action redirect, invalid-code persistence, and expired-challenge reset
- initial UI omitting the code field while retaining Show/Hide
- second-step UI exposing only the code input with `autocomplete="one-time-code"`
- challenge helper types accepting and validating `verify_totp`

## Out of Scope

- recovery codes
- remembered devices
- alternative second factors
- changing challenge lifetime or account lockout limits
- changing existing expired-lockout reset or failed-attempt handling
- changing password setup or TOTP enrollment UX
