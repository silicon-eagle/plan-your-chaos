import { describe, expect, it } from "vitest";
import { generateOpaqueToken, hashOpaqueToken } from "./tokens";

describe("generateOpaqueToken", () => {
  it("returns a non-empty string", () => {
    expect(typeof generateOpaqueToken()).toBe("string");
    expect(generateOpaqueToken().length).toBeGreaterThan(0);
  });

  it("produces unique tokens on each call", () => {
    expect(generateOpaqueToken()).not.toBe(generateOpaqueToken());
  });

  it("accepts a custom byte length", () => {
    const token = generateOpaqueToken(16);
    // base64url of 16 bytes → ~22 chars
    expect(token.length).toBeGreaterThan(0);
    const tokenDefault = generateOpaqueToken();
    // base64url of 32 bytes → ~43 chars; 16 bytes → ~22 chars
    expect(token.length).toBeLessThan(tokenDefault.length);
  });
});

describe("hashOpaqueToken", () => {
  it("hashes opaque tokens deterministically without returning the token", () => {
    expect(hashOpaqueToken("secret")).toHaveLength(64);
    expect(hashOpaqueToken("secret")).toBe(hashOpaqueToken("secret"));
    expect(hashOpaqueToken("secret")).not.toContain("secret");
  });

  it("produces different hashes for different tokens", () => {
    expect(hashOpaqueToken("tokenA")).not.toBe(hashOpaqueToken("tokenB"));
  });
});
