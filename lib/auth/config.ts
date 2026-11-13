export function getAuthCookieSecure(): boolean {
  const value = process.env.AUTH_COOKIE_SECURE;
  if (value === undefined) {
    return process.env.NODE_ENV === "production";
  }
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("AUTH_COOKIE_SECURE must be true or false");
}

export function getTotpEncryptionKey(): Buffer {
  const encoded = process.env.TOTP_ENCRYPTION_KEY;
  const key = encoded ? Buffer.from(encoded, "base64") : Buffer.alloc(0);

  if (key.length !== 32 || key.toString("base64") !== encoded) {
    throw new Error("TOTP_ENCRYPTION_KEY must be 32 bytes encoded as base64");
  }

  return key;
}
