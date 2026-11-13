import "server-only";

import { cookies } from "next/headers";
import { getAuthCookieSecure } from "./config";
import { CHALLENGE_COOKIE_NAME, SESSION_COOKIE_NAME } from "./constants";

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: getAuthCookieSecure(),
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function setSessionCookie(
  token: string,
  absoluteExpiresAt: Date,
): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    ...getCookieOptions(),
    expires: absoluteExpiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", {
    ...getCookieOptions(),
    expires: new Date(0),
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}

export async function setChallengeCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const store = await cookies();
  store.set(CHALLENGE_COOKIE_NAME, token, {
    ...getCookieOptions(),
    expires: expiresAt,
  });
}

export async function clearChallengeCookie(): Promise<void> {
  const store = await cookies();
  store.set(CHALLENGE_COOKIE_NAME, "", {
    ...getCookieOptions(),
    expires: new Date(0),
  });
}

export async function getChallengeToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(CHALLENGE_COOKIE_NAME)?.value;
}
