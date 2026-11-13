import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PasswordSetupForm } from "./PasswordSetupForm";

describe("PasswordSetupForm", () => {
  const defaultProps = {
    action: vi.fn(),
    isPending: false,
  };

  it("renders new password and confirmation fields", () => {
    render(<PasswordSetupForm {...defaultProps} />);

    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
  });

  it("reveals each password independently without changing values or submitting", () => {
    render(<PasswordSetupForm {...defaultProps} />);
    const password = screen.getByLabelText("New Password");
    const confirmation = screen.getByLabelText("Confirm Password");
    const form = password.closest("form")!;
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener("submit", onSubmit);
    fireEvent.change(password, { target: { value: "MiXeD-case-123!" } });
    fireEvent.change(confirmation, { target: { value: "MiXeD-case-123!" } });

    expect(password).toHaveAttribute("type", "password");
    expect(confirmation).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show new password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("MiXeD-case-123!");
    expect(confirmation).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show confirm password" }));
    expect(confirmation).toHaveAttribute("type", "text");
    expect(confirmation).toHaveValue("MiXeD-case-123!");
    fireEvent.click(screen.getByRole("button", { name: "Hide new password" }));
    expect(password).toHaveAttribute("type", "password");
    expect(confirmation).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide confirm password" }));
    expect(confirmation).toHaveAttribute("type", "password");

    const values = new FormData(form);
    expect(values.get("password")).toBe("MiXeD-case-123!");
    expect(values.get("confirmation")).toBe("MiXeD-case-123!");
    expect(onSubmit).not.toHaveBeenCalled();
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
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
  });
});
