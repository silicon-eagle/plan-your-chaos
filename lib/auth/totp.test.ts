import { randomBytes } from "node:crypto";
import * as OTPAuth from "otpauth";
import { beforeEach, describe, expect, it } from "vitest";
import { createTotpEnrollment, verifyTotpCode } from "./totp";

beforeEach(() => {
  process.env.TOTP_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("createTotpEnrollment", () => {
  it("returns a base32 secret and an otpauth URI", () => {
    const { secret, uri } = createTotpEnrollment("alice");
    expect(secret).toMatch(/^[A-Z2-7]+=*$/);
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("Plan%20Your%20Chaos");
    expect(uri).toContain("alice");
    expect(uri).toContain("secret=");
  });

  it("produces a unique secret each call", () => {
    const { secret: s1 } = createTotpEnrollment("alice");
    const { secret: s2 } = createTotpEnrollment("alice");
    expect(s1).not.toBe(s2);
  });

  it("recreates an enrollment URI from an existing secret", () => {
    const first = createTotpEnrollment("Alice");
    const repeated = createTotpEnrollment("Alice", first.secret);

    expect(repeated.secret).toBe(first.secret);
    expect(repeated.uri).toContain(first.secret);
  });
});

describe("verifyTotpCode", () => {
  function makeSecretAndTotp(userName = "test") {
    const { secret } = createTotpEnrollment(userName);
    return secret;
  }

  function generateCode(secret: string, timestamp: number): string {
    const totp = new OTPAuth.TOTP({
      issuer: "Plan Your Chaos",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    return totp.generate({ timestamp });
  }

  it("accepts a code for the current time step", () => {
    const secret = makeSecretAndTotp();
    const now = new Date(1_700_000_000_000); // fixed timestamp
    const code = generateCode(secret, now.getTime());
    const result = verifyTotpCode(secret, code, now);
    expect(result.valid).toBe(true);
    expect(result.counter).not.toBeNull();
  });

  it("accepts a code from the previous time step (window=1)", () => {
    const secret = makeSecretAndTotp();
    const now = new Date(1_700_000_000_000);
    // Code generated one period earlier
    const prevTime = now.getTime() - 30_000;
    const code = generateCode(secret, prevTime);
    const result = verifyTotpCode(secret, code, now);
    expect(result.valid).toBe(true);
    // delta = -1 → counter = floor(1_700_000_000_000 / 30_000) + (-1) = 56666665
    expect(result.counter).toBe(56666665);
  });

  it("accepts a code from the next time step (window=1)", () => {
    const secret = makeSecretAndTotp();
    const now = new Date(1_700_000_000_000);
    const nextTime = now.getTime() + 30_000;
    const code = generateCode(secret, nextTime);
    const result = verifyTotpCode(secret, code, now);
    expect(result.valid).toBe(true);
    // delta = +1 → counter = floor(1_700_000_000_000 / 30_000) + 1 = 56666667
    expect(result.counter).toBe(56666667);
  });

  it("rejects a code outside the window", () => {
    const secret = makeSecretAndTotp();
    const now = new Date(1_700_000_000_000);
    // Code generated two periods away
    const farTime = now.getTime() + 60_000;
    const code = generateCode(secret, farTime);
    const result = verifyTotpCode(secret, code, now);
    expect(result.valid).toBe(false);
    expect(result.counter).toBeNull();
  });

  it("returns the correct counter value for replay-rejection", () => {
    const secret = makeSecretAndTotp();
    const now = new Date(1_700_000_000_000);
    const code = generateCode(secret, now.getTime());
    const result = verifyTotpCode(secret, code, now);
    const expectedCounter = Math.floor(now.getTime() / (30 * 1000));
    expect(result.counter).toBe(expectedCounter);
  });

  it("returns { valid: false, counter: null } for a wrong code", () => {
    const secret = makeSecretAndTotp();
    const now = new Date(1_700_000_000_000);
    // Generate a code two periods in the past — deterministically outside ±1 window
    const outdatedCode = generateCode(secret, now.getTime() - 60_000);
    const result = verifyTotpCode(secret, outdatedCode, now);
    expect(result.valid).toBe(false);
    expect(result.counter).toBeNull();
  });
});
