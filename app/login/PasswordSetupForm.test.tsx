import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PasswordSetupForm } from "./PasswordSetupForm";

describe("PasswordSetupForm", () => {
  const defaultProps = {
    action: vi.fn(),
    isPending: false,
  };

  it("renders new password and confirmation fields", () => {
    render(<PasswordSetupForm {...defaultProps} />);

    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("renders a submit button", () => {
    render(<PasswordSetupForm {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /set password/i }),
    ).toBeInTheDocument();
  });

  it("has an aria-live polite region for errors", () => {
    render(<PasswordSetupForm {...defaultProps} />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("displays an error message when provided", () => {
    render(<PasswordSetupForm {...defaultProps} error="Passwords do not match." />);
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
  });

  it("all controls have visible labels", () => {
    render(<PasswordSetupForm {...defaultProps} />);
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });
});
