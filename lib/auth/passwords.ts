import type { Algorithm } from "@node-rs/argon2";
import { hash, verify } from "@node-rs/argon2";
import { AUTH_LIMITS } from "./constants";

// Algorithm is a const enum (incompatible with isolatedModules); use a typed
// literal constant instead of importing the runtime value.
const ALGORITHM_ARGON2ID = 2 as Algorithm;

const ARGON2_OPTIONS = {
  algorithm: ALGORITHM_ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}

export function validateNewPassword(
  password: string,
  confirmation: string,
): string | null {
  if (
    password.length < AUTH_LIMITS.passwordMinLength ||
    password.length > AUTH_LIMITS.passwordMaxLength
  ) {
    return `Password must contain ${AUTH_LIMITS.passwordMinLength} to ${AUTH_LIMITS.passwordMaxLength} characters.`;
  }
  if (password !== confirmation) {
    return "Passwords do not match.";
  }
  return null;
}
