import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { getTotpEncryptionKey } from "./config";

const ALGORITHM = "aes-256-gcm";

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getTotpEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptTotpSecret(payload: string): string {
  const segments = payload.split(".");
  if (segments.length !== 4) {
    throw new Error("Invalid TOTP secret payload: expected 4 segments");
  }
  const [version, ivB64, tagB64, ctB64] = segments;
  if (version !== "v1") {
    throw new Error(`Unsupported TOTP secret payload version: ${version}`);
  }
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const ciphertext = Buffer.from(ctB64, "base64url");

  const decipher = createDecipheriv(ALGORITHM, getTotpEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
