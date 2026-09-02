export function getTotpEncryptionKey(): Buffer {
  const encoded = process.env.TOTP_ENCRYPTION_KEY;
  const key = encoded ? Buffer.from(encoded, "base64") : Buffer.alloc(0);

  if (key.length !== 32 || key.toString("base64") !== encoded) {
    throw new Error("TOTP_ENCRYPTION_KEY must be 32 bytes encoded as base64");
  }

  return key;
}
