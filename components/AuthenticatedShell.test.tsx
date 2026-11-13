import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));
});

afterAll(() => {
  vi.useRealTimers();
});

describe("AuthenticatedShell", () => {
  it("shows the current copyright year and package version", () => {
    render(
      <AuthenticatedShell session={session}>
        <main>Calendar</main>
      </AuthenticatedShell>,
    );

    expect(screen.getByText(
      "© 2026 Tim Kelch. All rights reserved. | Version 1.3.7",
    )).toBeInTheDocument();
  });
});
