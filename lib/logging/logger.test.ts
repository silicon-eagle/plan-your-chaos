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
});
