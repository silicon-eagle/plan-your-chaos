import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { config, proxy } from "./proxy";

function createRequest(
  pathname: string,
  init: ConstructorParameters<typeof NextRequest>[1] = {},
) {
  return new NextRequest(new URL(pathname, "http://localhost"), init);
}

describe("proxy", () => {
  it("uses an explicit matcher that excludes static assets", () => {
    expect(config.matcher).toEqual([
      "/((?!_next/static|_next/image|favicon.ico|fonts/|images/|assets/).*)",
    ]);
  });

  it.each(["/", "/login"])("passes public page %s without a cookie", (path) => {
    const response = proxy(createRequest(path));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each([
    "/_next/static/chunks/app.js",
    "/_next/image",
    "/favicon.ico",
    "/fonts/silkscreen.woff2",
    "/images/logo.png",
    "/assets/sprite.png",
  ])("passes static path %s without a cookie", (path) => {
    const response = proxy(createRequest(path));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each(["/calendar", "/events", "/day/2026-08-29", "/user"])(
    "redirects protected HTML path %s to /login without a cookie",
    (path) => {
      const response = proxy(createRequest(path));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/login");
    },
  );

  it("returns a JSON 401 for unauthenticated API requests", async () => {
    const response = proxy(createRequest("/api/events"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
  });

  it("passes requests with the session cookie through", () => {
    const response = proxy(
      createRequest("/api/events", {
        headers: {
          cookie: "plan-your-chaos-session=token-value",
        },
      }),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
