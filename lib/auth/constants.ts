export const SESSION_COOKIE_NAME = "plan-your-chaos-session";
export const CHALLENGE_COOKIE_NAME = "plan-your-chaos-login-challenge";

export const AUTH_LIMITS = {
  passwordMinLength: 12,
  passwordMaxLength: 128,
  maxFailedAttempts: 5,
  lockoutMs: 15 * 60 * 1000,
  challengeLifetimeMs: 10 * 60 * 1000,
  idleSessionMs: 24 * 60 * 60 * 1000,
  absoluteSessionMs: 7 * 24 * 60 * 60 * 1000,
  activityWriteIntervalMs: 5 * 60 * 1000,
  totpPeriodSeconds: 30,
  totpDigits: 6,
  totpWindow: 1,
} as const;
