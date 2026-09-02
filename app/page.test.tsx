import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth/authorization", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/components/EventList/EventList", () => ({
  EventList: () => <div>Upcoming event list</div>,
}));

vi.mock("@/components/AuthenticatedShell", () => ({
  AuthenticatedShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import Home from "./page";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ events: [] }), { status: 200 }),
      ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Home", () => {
  it("renders only Login when unauthenticated", async () => {
    mocks.getSession.mockResolvedValue(null);
    render(await Home());
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByLabelText("Calendar")).not.toBeInTheDocument();
    expect(screen.queryByText("Upcoming event list")).not.toBeInTheDocument();
  });

  it("renders the calendar and upcoming events when authenticated", async () => {
    mocks.getSession.mockResolvedValue({
      id: 1,
      user: { id: 1, name: "Alice", avatarPath: null },
      createdAt: new Date(),
      lastActiveAt: new Date(),
      idleExpiresAt: new Date(),
      absoluteExpiresAt: new Date(),
    });
    render(await Home());

    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next month" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Upcoming event list")).toBeInTheDocument();
  });
});
