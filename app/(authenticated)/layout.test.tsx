import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePageSession: vi.fn(),
}));

vi.mock("@/lib/auth/authorization", () => ({
  requirePageSession: mocks.requirePageSession,
}));

vi.mock("@/components/AuthenticatedShell", () => ({
  AuthenticatedShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));

import AuthenticatedLayout from "./layout";

describe("AuthenticatedLayout", () => {
  it("redirects before rendering protected children without a session", async () => {
    mocks.requirePageSession.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(
      AuthenticatedLayout({ children: <div>Secret calendar</div> }),
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("renders AuthenticatedShell with children when session is valid", async () => {
    mocks.requirePageSession.mockResolvedValue({
      id: 1,
      user: { id: 1, name: "Alice", avatarPath: null },
      createdAt: new Date(),
      lastActiveAt: new Date(),
      idleExpiresAt: new Date(),
      absoluteExpiresAt: new Date(),
    });

    const page = await AuthenticatedLayout({
      children: <div>Protected content</div>,
    });
    render(page);

    expect(screen.getByTestId("shell")).toBeInTheDocument();
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
