import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { version } from "@/package.json";

vi.mock("@/components/Header", () => ({
  Header: () => <header />,
}));

import { AuthenticatedShell } from "./AuthenticatedShell";

const session = {
  id: 1,
  user: { id: 1, name: "Alice", role: "User" as const },
  createdAt: new Date(),
  lastActiveAt: new Date(),
  idleExpiresAt: new Date(),
  absoluteExpiresAt: new Date(),
};

describe("AuthenticatedShell", () => {
  it("shows the current copyright year and package version", () => {
    render(
      <AuthenticatedShell session={session}>
        <main>Calendar</main>
      </AuthenticatedShell>,
    );

    expect(screen.getByText(
      `© ${new Date().getFullYear()} Tim Kelch. All rights reserved. | Version ${version}`,
    )).toBeInTheDocument();
  });
});
