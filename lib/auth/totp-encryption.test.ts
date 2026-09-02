import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptTotpSecret, encryptTotpSecret } from "./totp-encryption";

const VALID_KEY = randomBytes(32).toString("base64");

beforeEach(() => {
  process.env.TOTP_ENCRYPTION_KEY = VALID_KEY;
});

afterEach(() => {
  delete process.env.TOTP_ENCRYPTION_KEY;
});

describe("encryptTotpSecret / decryptTotpSecret", () => {
  it("round-trips a TOTP secret", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const payload = encryptTotpSecret(secret);
    expect(decryptTotpSecret(payload)).toBe(secret);
  });

  it("produces a different ciphertext each call (random nonce)", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const payload1 = encryptTotpSecret(secret);
    const payload2 = encryptTotpSecret(secret);
    expect(payload1).not.toBe(payload2);
  });

  it("produces a v1 payload with four dot-separated segments", () => {
    const payload = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    const segments = payload.split(".");
    expect(segments).toHaveLength(4);
    expect(segments[0]).toBe("v1");
  });

  it("throws on a payload with wrong number of segments", () => {
    expect(() => decryptTotpSecret("v1.only.three")).toThrow();
  });

  it("throws on an unsupported version", () => {
    const payload = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    const segments = payload.split(".");
    segments[0] = "v99";
    expect(() => decryptTotpSecret(segments.join("."))).toThrow();
  });

  it("throws when the authentication tag is modified (tamper detection)", () => {
    const payload = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    const segments = payload.split(".");
    // Flip a byte in the auth tag segment
    const tagBuf = Buffer.from(segments[2], "base64url");
    tagBuf[0] ^= 0xff;
    segments[2] = tagBuf.toString("base64url");
    expect(() => decryptTotpSecret(segments.join("."))).toThrow();
  });

  it("throws when ciphertext is modified", () => {
    const payload = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    const segments = payload.split(".");
    const ctBuf = Buffer.from(segments[3], "base64url");
    ctBuf[0] ^= 0xff;
    segments[3] = ctBuf.toString("base64url");
    expect(() => decryptTotpSecret(segments.join("."))).toThrow();
  });

  it("throws when decrypting with a different key", () => {
    const payload = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    // Switch to a different key
    process.env.TOTP_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => decryptTotpSecret(payload)).toThrow();
  });
});
