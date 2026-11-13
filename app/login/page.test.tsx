import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { version } from "@/package.json";

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
  LoginForm: () => <form aria-label="Login" />,
}));

import LoginPage from "./page";

const authenticatedSession = {
  id: 1,
  user: { id: 1, name: "Alice", role: "User" },
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

  it("renders the login form without fetching the account list", async () => {
    mocks.getSession.mockResolvedValue(null);

    render(await LoginPage());

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.dbSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("form", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByText(
      `© ${new Date().getFullYear()} Tim Kelch. All rights reserved. | Version ${version}`,
    )).toBeInTheDocument();
  });
});
