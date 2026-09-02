import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionToken: vi.fn(),
  findSessionByToken: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("./cookies", () => ({ getSessionToken: mocks.getSessionToken }));
vi.mock("./sessions", () => ({ findSessionByToken: mocks.findSessionByToken }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  UnauthenticatedError,
  getSession,
  isSameOrigin,
  requirePageSession,
  requireSession,
  withApiAuthentication,
} from "./authorization";

const baseSession = {
  id: 1,
  user: { id: 2, name: "Alice", avatarPath: null },
  createdAt: new Date("2026-08-28T12:00:00.000Z"),
  lastActiveAt: new Date("2026-08-28T12:00:00.000Z"),
  idleExpiresAt: new Date("2026-08-29T12:00:00.000Z"),
  absoluteExpiresAt: new Date("2026-09-04T12:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  // Simulate real Next.js redirect: it always throws internally.
  mocks.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

// ── getSession ─────────────────────────────────────────────────────────────

describe("getSession", () => {
  it("returns null when no session cookie is present", async () => {
    mocks.getSessionToken.mockResolvedValue(undefined);
    const result = await getSession();
    expect(result).toBeNull();
    expect(mocks.findSessionByToken).not.toHaveBeenCalled();
  });

  it("returns null when the session token is invalid or expired", async () => {
    mocks.getSessionToken.mockResolvedValue("invalid-token");
    mocks.findSessionByToken.mockResolvedValue(null);
    const result = await getSession();
    expect(result).toBeNull();
  });

  it("returns the authenticated session when the token is valid", async () => {
    mocks.getSessionToken.mockResolvedValue("valid-token");
    mocks.findSessionByToken.mockResolvedValue(baseSession);
    const result = await getSession();
    expect(result).toEqual(baseSession);
  });

  it("propagates database errors", async () => {
    mocks.getSessionToken.mockResolvedValue("some-token");
    mocks.findSessionByToken.mockRejectedValue(new Error("Database error"));
    await expect(getSession()).rejects.toThrow("Database error");
  });
});

// ── requireSession ─────────────────────────────────────────────────────────

describe("requireSession", () => {
  it("throws UnauthenticatedError when no session is found", async () => {
    mocks.getSessionToken.mockResolvedValue(undefined);
    await expect(requireSession()).rejects.toThrow(UnauthenticatedError);
  });

  it("returns the session when authenticated", async () => {
    mocks.getSessionToken.mockResolvedValue("valid-token");
    mocks.findSessionByToken.mockResolvedValue(baseSession);
    const result = await requireSession();
    expect(result).toEqual(baseSession);
  });
});

// ── requirePageSession ─────────────────────────────────────────────────────

describe("requirePageSession", () => {
  it("redirects to /login when not authenticated", async () => {
    mocks.getSessionToken.mockResolvedValue(undefined);
    await expect(requirePageSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("returns the session when authenticated", async () => {
    mocks.getSessionToken.mockResolvedValue("valid-token");
    mocks.findSessionByToken.mockResolvedValue(baseSession);
    const result = await requirePageSession();
    expect(result).toEqual(baseSession);
  });

  it("propagates non-UnauthenticatedError errors without redirecting", async () => {
    mocks.getSessionToken.mockResolvedValue("some-token");
    mocks.findSessionByToken.mockRejectedValue(new Error("Database error"));
    await expect(requirePageSession()).rejects.toThrow("Database error");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

// ── isSameOrigin ───────────────────────────────────────────────────────────

describe("isSameOrigin", () => {
  it("returns false when the Origin header is absent", () => {
    const request = new Request("https://calendar.test/api/events", {
      method: "POST",
    });
    expect(isSameOrigin(request)).toBe(false);
  });

  it("returns true when the Origin matches the request URL origin", () => {
    const request = new Request("https://calendar.test/api/events", {
      method: "POST",
      headers: { Origin: "https://calendar.test" },
    });
    expect(isSameOrigin(request)).toBe(true);
  });

  it("returns false when the Origin does not match the request URL origin", () => {
    const request = new Request("https://calendar.test/api/events", {
      method: "POST",
      headers: { Origin: "https://evil.example.com" },
    });
    expect(isSameOrigin(request)).toBe(false);
  });
});

// ── withApiAuthentication ──────────────────────────────────────────────────

describe("withApiAuthentication", () => {
  it("returns a JSON 401 before the API handler runs", async () => {
    mocks.getSessionToken.mockResolvedValue(undefined);
    const handler = vi.fn();
    const protectedHandler = withApiAuthentication(handler);
    const response = await protectedHandler(
      new Request("https://calendar.test/api/events"),
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls the handler when authenticated with same-origin POST", async () => {
    mocks.getSessionToken.mockResolvedValue("valid-token");
    mocks.findSessionByToken.mockResolvedValue(baseSession);
    const handler = vi.fn().mockResolvedValue(Response.json({ data: "ok" }));
    const protectedHandler = withApiAuthentication(handler);
    const response = await protectedHandler(
      new Request("https://calendar.test/api/events", {
        method: "POST",
        headers: { Origin: "https://calendar.test" },
      }),
    );
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it("passes the authenticated session to the API handler", async () => {
    mocks.getSessionToken.mockResolvedValue("valid-token");
    mocks.findSessionByToken.mockResolvedValue(baseSession);
    const handler = vi.fn().mockResolvedValue(Response.json({ data: "ok" }));
    const protectedHandler = withApiAuthentication(handler);

    await protectedHandler(
      new Request("https://calendar.test/api/events", {
        method: "POST",
        headers: { Origin: "https://calendar.test" },
      }),
    );

    expect(handler).toHaveBeenCalledWith(expect.any(Request), baseSession);
  });

  it("does not check origin for GET requests", async () => {
    mocks.getSessionToken.mockResolvedValue("valid-token");
    mocks.findSessionByToken.mockResolvedValue(baseSession);
    const handler = vi.fn().mockResolvedValue(Response.json({ data: "ok" }));
    const protectedHandler = withApiAuthentication(handler);
    const response = await protectedHandler(
      new Request("https://calendar.test/api/events"),
    );
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalled();
  });

  it("calls the handler when authenticated with HEAD and no Origin", async () => {
    mocks.getSessionToken.mockResolvedValue("valid-token");
    mocks.findSessionByToken.mockResolvedValue(baseSession);
    const handler = vi.fn().mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    const protectedHandler = withApiAuthentication(handler);
    const response = await protectedHandler(
      new Request("https://calendar.test/api/events", {
        method: "HEAD",
      }),
    );
    expect(response.status).toBe(204);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("returns JSON 403 for cross-origin POST when authenticated", async () => {
    mocks.getSessionToken.mockResolvedValue("valid-token");
    mocks.findSessionByToken.mockResolvedValue(baseSession);
    const handler = vi.fn();
    const protectedHandler = withApiAuthentication(handler);
    const response = await protectedHandler(
      new Request("https://calendar.test/api/events", {
        method: "POST",
        headers: { Origin: "https://evil.example.com" },
      }),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns JSON 403 for missing Origin on PATCH when authenticated", async () => {
    mocks.getSessionToken.mockResolvedValue("valid-token");
    mocks.findSessionByToken.mockResolvedValue(baseSession);
    const handler = vi.fn();
    const protectedHandler = withApiAuthentication(handler);
    const response = await protectedHandler(
      new Request("https://calendar.test/api/events/1", { method: "PATCH" }),
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns JSON 403 for missing Origin on DELETE when authenticated", async () => {
    mocks.getSessionToken.mockResolvedValue("valid-token");
    mocks.findSessionByToken.mockResolvedValue(baseSession);
    const handler = vi.fn();
    const protectedHandler = withApiAuthentication(handler);
    const response = await protectedHandler(
      new Request("https://calendar.test/api/events/1", { method: "DELETE" }),
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});
