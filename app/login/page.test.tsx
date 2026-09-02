import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock("@/lib/auth/authorization", () => ({
  getSession: mocks.getSession,
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));
vi.mock("@/db", () => ({
  db: { select: mocks.dbSelect },
}));
vi.mock("./LoginForm", () => ({
  LoginForm: ({ users }: { users: { id: number; name: string }[] }) => (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  ),
}));

import LoginPage from "./page";

const authenticatedSession = {
  id: 1,
  user: { id: 1, name: "Alice", avatarPath: null },
  createdAt: new Date(),
  lastActiveAt: new Date(),
  idleExpiresAt: new Date(),
  absoluteExpiresAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LoginPage", () => {
  it("redirects to / when authenticated", async () => {
    mocks.getSession.mockResolvedValue(authenticatedSession);
    mocks.redirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT:/");
    });

    await expect(LoginPage()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("does not query users when authenticated", async () => {
    mocks.getSession.mockResolvedValue(authenticatedSession);
    mocks.redirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT:/");
    });

    await expect(LoginPage()).rejects.toThrow();
    expect(mocks.dbSelect).not.toHaveBeenCalled();
  });

  it("renders the login form and queries only id and name when unauthenticated", async () => {
    mocks.getSession.mockResolvedValue(null);

    const orderBy = vi.fn().mockResolvedValue([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
    mocks.dbSelect.mockReturnValue({ from: vi.fn(() => ({ orderBy })) });

    render(await LoginPage());

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.dbSelect).toHaveBeenCalled();
    const selectArg = mocks.dbSelect.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(selectArg)).toEqual(["id", "name"]);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
