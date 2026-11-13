import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedUseActionState = vi.hoisted(() => vi.fn());

vi.mock("./actions", () => ({
  loginFlowAction: vi.fn(),
}));
vi.mock("react", async () => ({
  ...(await vi.importActual<typeof import("react")>("react")),
  useActionState: mockedUseActionState,
}));

import { LoginForm } from "./LoginForm";

beforeEach(() => {
  mockedUseActionState.mockReturnValue([{}, vi.fn(), false]);
});

describe("LoginForm", () => {
  it("uses a required username text field instead of listing accounts", () => {
    render(<LoginForm />);
    const username = screen.getByRole("textbox", { name: "Username" });
    expect(username).toHaveAttribute("name", "username");
    expect(username).toHaveAttribute("type", "text");
    expect(username).toHaveAttribute("autocomplete", "username");
    expect(username).toBeRequired();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders password input", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("reveals and hides the entered password without submitting the form", () => {
    render(<LoginForm />);
    const password = screen.getByLabelText("Password");
    const form = password.closest("form")!;
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener("submit", onSubmit);
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "Veerle" },
    });
    fireEvent.change(password, { target: { value: "MiXeD-case-123!" } });

    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue("MiXeD-case-123!");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
    expect(new FormData(form).get("password")).toBe("MiXeD-case-123!");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not render a verification code on the password step", () => {
    render(<LoginForm />);
    expect(
      screen.queryByLabelText(/verification code/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show password" }),
    ).toBeInTheDocument();
  });

  it("renders a dedicated one-time-code form for verify_totp", () => {
    mockedUseActionState.mockReturnValue([
      { step: "verify_totp" },
      vi.fn(),
      false,
    ]);

    render(<LoginForm />);

    const code = screen.getByLabelText("Verification Code");
    expect(code).toHaveAttribute("name", "code");
    expect(code).toHaveAttribute("autocomplete", "one-time-code");
    expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("renders a submit button", () => {
    render(<LoginForm />);
    expect(
      screen.getByRole("button", { name: /log in/i }),
    ).toBeInTheDocument();
  });

  it("has an aria-live polite region for errors", () => {
    render(<LoginForm />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("all controls have visible labels", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });
});
