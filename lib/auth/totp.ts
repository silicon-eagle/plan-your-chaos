import * as OTPAuth from "otpauth";
import { AUTH_LIMITS } from "./constants";

export type TotpVerification = {
  valid: boolean;
  counter: number | null;
};

export function createTotpEnrollment(
  userName: string,
  existingSecret?: string,
): {
  secret: string;
  uri: string;
} {
  const secret = existingSecret
    ? OTPAuth.Secret.fromBase32(existingSecret)
    : new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: "Plan Your Chaos",
    label: userName,
    algorithm: "SHA1",
    digits: AUTH_LIMITS.totpDigits,
    period: AUTH_LIMITS.totpPeriodSeconds,
    secret,
  });
  return { secret: secret.base32, uri: totp.toString() };
}

export function verifyTotpCode(
  secret: string,
  code: string,
  now?: Date,
): TotpVerification {
  const totp = new OTPAuth.TOTP({
    issuer: "Plan Your Chaos",
    algorithm: "SHA1",
    digits: AUTH_LIMITS.totpDigits,
    period: AUTH_LIMITS.totpPeriodSeconds,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const timestamp = now ? now.getTime() : Date.now();
  const delta = totp.validate({
    token: code,
    timestamp,
    window: AUTH_LIMITS.totpWindow,
  });

  if (delta === null) {
    return { valid: false, counter: null };
  }

  const counter =
    Math.floor(timestamp / (AUTH_LIMITS.totpPeriodSeconds * 1000)) + delta;
  return { valid: true, counter };
}
