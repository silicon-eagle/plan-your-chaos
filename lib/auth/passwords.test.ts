import { describe, expect, it } from "vitest";
import {
  hashPassword,
  validateNewPassword,
  verifyPassword,
} from "./passwords";

describe("hashPassword / verifyPassword", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(
      verifyPassword(hash, "correct horse battery staple"),
    ).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong password")).resolves.toBe(false);
  });

  it("throws on a malformed stored hash rather than resolving false", async () => {
    await expect(
      verifyPassword("garbage-hash", "any-password"),
    ).rejects.toThrow();
  });

  it("produces distinct hashes for the same password (random salt)", async () => {
    const hash1 = await hashPassword("same password here!");
    const hash2 = await hashPassword("same password here!");
    expect(hash1).not.toBe(hash2);
  });
});

describe("validateNewPassword", () => {
  it("rejects passwords shorter than 12 characters", () => {
    expect(validateNewPassword("short", "short")).toBe(
      "Password must contain 12 to 128 characters.",
    );
  });

  it("rejects passwords longer than 128 characters", () => {
    const long = "a".repeat(129);
    expect(validateNewPassword(long, long)).toBe(
      "Password must contain 12 to 128 characters.",
    );
  });

  it("rejects mismatched confirmation", () => {
    expect(
      validateNewPassword(
        "correct horse battery staple",
        "different confirmation",
      ),
    ).toBe("Passwords do not match.");
  });

  it("returns null for a valid password and matching confirmation", () => {
    expect(
      validateNewPassword("correct horse battery staple", "correct horse battery staple"),
    ).toBeNull();
  });

  it("enforces length check before confirmation check", () => {
    expect(validateNewPassword("short", "different confirmation")).toBe(
      "Password must contain 12 to 128 characters.",
    );
  });
});
