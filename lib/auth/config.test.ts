import { afterEach, describe, expect, it } from "vitest";
import { getTotpEncryptionKey } from "./config";

afterEach(() => {
  delete process.env.TOTP_ENCRYPTION_KEY;
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
