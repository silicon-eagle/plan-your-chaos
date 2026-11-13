import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthCookieSecure, getTotpEncryptionKey } from "./config";

afterEach(() => {
  delete process.env.TOTP_ENCRYPTION_KEY;
  vi.unstubAllEnvs();
});

describe("getAuthCookieSecure", () => {
  it("rejects an invalid override instead of silently choosing a cookie policy", () => {
    vi.stubEnv("AUTH_COOKIE_SECURE", "not-a-boolean");
    expect(() => getAuthCookieSecure()).toThrow(
      "AUTH_COOKIE_SECURE must be true or false",
    );
  });
});

describe("getTotpEncryptionKey", () => {
  it("returns exactly 32 decoded bytes", () => {
    process.env.TOTP_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    expect(getTotpEncryptionKey()).toEqual(Buffer.alloc(32, 7));
  });

  it("rejects a missing or incorrectly sized key", () => {
    expect(() => getTotpEncryptionKey()).toThrow(
      "TOTP_ENCRYPTION_KEY must be 32 bytes encoded as base64",
    );
    process.env.TOTP_ENCRYPTION_KEY = Buffer.alloc(31).toString("base64");
    expect(() => getTotpEncryptionKey()).toThrow(
      "TOTP_ENCRYPTION_KEY must be 32 bytes encoded as base64",
    );
  });
});
