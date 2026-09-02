import { afterEach, describe, expect, it, vi } from "vitest";
import { withRequestLogging } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("withRequestLogging", () => {
  it("logs request completion with status and request ID", async () => {
    vi.stubEnv("ENABLE_TEST_LOGS", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const handler = withRequestLogging("GET /test", async () =>
      Response.json({ ok: true }),
    );

    await handler(
      new Request("http://localhost/test", {
        headers: { "x-request-id": "request-1" },
      }),
    );

    const completedLog = JSON.parse(
      String(info.mock.calls.at(-1)?.[0]),
    ) as Record<string, unknown>;
    expect(completedLog).toEqual(
      expect.objectContaining({
        event: "http.request.completed",
        requestId: "request-1",
        status: 200,
      }),
    );
  });

  it("logs failures and rethrows them", async () => {
    vi.stubEnv("ENABLE_TEST_LOGS", "true");
    vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withRequestLogging("GET /test", async () => {
      throw new Error("Database unavailable");
    });

    await expect(
      handler(new Request("http://localhost/test")),
    ).rejects.toThrow("Database unavailable");
    expect(error).toHaveBeenCalledOnce();
  });

  it("does not include authorization headers, cookies, or request bodies in log context", async () => {
    vi.stubEnv("ENABLE_TEST_LOGS", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sensitiveBodyValue = "sensitive-body-value";

    const handler = withRequestLogging("GET /api/protected", async () =>
      Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    );

    await handler(
      new Request("http://localhost/api/protected", {
        method: "POST",
        body: JSON.stringify({ password: sensitiveBodyValue }),
        headers: {
          "x-request-id": "req-safe-check",
          Authorization: "Bearer super-secret-token",
          Cookie: "plan-your-chaos-session=sensitive-cookie-value",
          "content-type": "application/json",
        },
      }),
    );

    const allLogs = [
      ...info.mock.calls.map((c) => String(c[0])),
      ...warn.mock.calls.map((c) => String(c[0])),
    ].join("\n");

    expect(allLogs).not.toContain("Bearer");
    expect(allLogs).not.toContain("super-secret-token");
    expect(allLogs).not.toContain("sensitive-cookie-value");
    expect(allLogs).not.toContain(sensitiveBodyValue);

    const parsedLogs = [...info.mock.calls, ...warn.mock.calls].map((c) =>
      JSON.parse(String(c[0])) as Record<string, unknown>,
    );
    const completed = parsedLogs.find(
      (l) => l.event === "http.request.completed",
    );
    expect(completed).toMatchObject({
      requestId: "req-safe-check",
      status: 401,
    });
  });
});
