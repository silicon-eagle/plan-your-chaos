import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({
  loginFlowAction: vi.fn(),
}));

import { LoginForm } from "./LoginForm";

const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
];

describe("LoginForm", () => {
  it("renders household dropdown with users", () => {
    render(<LoginForm users={users} />);

    const dropdown = screen.getByRole("combobox", {
      name: /household member/i,
    });
    expect(dropdown).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bob" })).toBeInTheDocument();
  });

  it("has a disabled blank placeholder option at the top of the dropdown", () => {
    render(<LoginForm users={users} />);

    const placeholder = screen.getByRole("option", {
      name: /select a household member/i,
    });
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toBeDisabled();
    expect(placeholder).toHaveValue("");
  });

  it("renders password input", () => {
    render(<LoginForm users={users} />);
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders TOTP verification code input", () => {
    render(<LoginForm users={users} />);
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
  });

  it("renders a submit button", () => {
    render(<LoginForm users={users} />);
    expect(
      screen.getByRole("button", { name: /log in/i }),
    ).toBeInTheDocument();
  });

  it("has an aria-live polite region for errors", () => {
    render(<LoginForm users={users} />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("all controls have visible labels", () => {
    render(<LoginForm users={users} />);
    expect(screen.getByLabelText(/household member/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
  });
});
