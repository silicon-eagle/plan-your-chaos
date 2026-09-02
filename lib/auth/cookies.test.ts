import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));

import {
  clearChallengeCookie,
  clearSessionCookie,
  getChallengeToken,
  getSessionToken,
  setChallengeCookie,
  setSessionCookie,
} from "./cookies";
import { CHALLENGE_COOKIE_NAME, SESSION_COOKIE_NAME } from "./constants";

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookies.mockResolvedValue(cookieStore);
});

describe("setSessionCookie", () => {
  it("sets the session cookie with the token and absolute expiry", async () => {
    const token = "test-token-abc";
    const expiresAt = new Date("2026-09-04T12:00:00.000Z");
    await setSessionCookie(token, expiresAt);
    expect(cookieStore.set).toHaveBeenCalledWith(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  });
});

describe("clearSessionCookie", () => {
  it("overwrites the session cookie with an empty value and an expired date", async () => {
    await clearSessionCookie();
    const [name, value, options] = cookieStore.set.mock.calls[0];
    expect(name).toBe(SESSION_COOKIE_NAME);
    expect(value).toBe("");
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.expires).toEqual(new Date(0));
  });
});

describe("getSessionToken", () => {
  it("returns the token value when the cookie is present", async () => {
    cookieStore.get.mockReturnValue({ value: "my-session-token" });
    const token = await getSessionToken();
    expect(token).toBe("my-session-token");
    expect(cookieStore.get).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
  });

  it("returns undefined when the session cookie is absent", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const token = await getSessionToken();
    expect(token).toBeUndefined();
  });
});

describe("setChallengeCookie", () => {
  it("sets the challenge cookie with the token and expiry", async () => {
    const token = "challenge-xyz";
    const expiresAt = new Date("2026-08-28T12:10:00.000Z");
    await setChallengeCookie(token, expiresAt);
    expect(cookieStore.set).toHaveBeenCalledWith(CHALLENGE_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  });
});

describe("clearChallengeCookie", () => {
  it("overwrites the challenge cookie with an empty value and an expired date", async () => {
    await clearChallengeCookie();
    const [name, value, options] = cookieStore.set.mock.calls[0];
    expect(name).toBe(CHALLENGE_COOKIE_NAME);
    expect(value).toBe("");
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.expires).toEqual(new Date(0));
  });
});

describe("getChallengeToken", () => {
  it("returns the token value when the challenge cookie is present", async () => {
    cookieStore.get.mockReturnValue({ value: "challenge-token-99" });
    const token = await getChallengeToken();
    expect(token).toBe("challenge-token-99");
    expect(cookieStore.get).toHaveBeenCalledWith(CHALLENGE_COOKIE_NAME);
  });

  it("returns undefined when the challenge cookie is absent", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const token = await getChallengeToken();
    expect(token).toBeUndefined();
  });
});
