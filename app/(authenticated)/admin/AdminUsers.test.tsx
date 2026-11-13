import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ManagedUser } from "@/lib/auth/admin-service";

const mocks = vi.hoisted(() => ({ manageUserAction: vi.fn() }));
vi.mock("./actions", () => ({ manageUserAction: mocks.manageUserAction }));

import { AdminUsers } from "./AdminUsers";

const users: ManagedUser[] = [
  { id: 1, name: "Admin", role: "Admin", hasPassword: true, mustSetPassword: false, hasTotp: true },
  { id: 2, name: "Tim", role: "User", hasPassword: false, mustSetPassword: false, hasTotp: false },
  { id: 3, name: "Visitor", role: "Reader", hasPassword: true, mustSetPassword: true, hasTotp: false },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe("admin account management", () => {
  it("shows setup status and only User/Reader creation choices", () => {
    render(<AdminUsers users={users} currentUserId={1} />);
    const create = screen.getByRole("form", { name: "Create account" });
    expect(within(create).getAllByRole("option").map((option) => option.textContent))
      .toEqual(["User", "Reader"]);
    expect(screen.getByText("No password issued")).toBeInTheDocument();
    expect(screen.getByText("Password change required")).toBeInTheDocument();
    expect(screen.getAllByText("Authenticator not enrolled")).toHaveLength(2);
  });

  it("never offers Admin rename, demotion, or deletion controls", () => {
    render(<AdminUsers users={users} currentUserId={1} />);
    const admin = screen.getByRole("article", { name: "Admin" });
    expect(within(admin).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(admin).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(admin).queryByText("Delete account")).not.toBeInTheDocument();
    expect(within(admin).getByText(/signs you out/)).toBeInTheDocument();
  });

  it("requires named confirmation and warns about cascading event deletion", () => {
    render(<AdminUsers users={users} currentUserId={1} />);
    const account = screen.getByRole("article", { name: "Tim" });
    const summary = within(account).getByText("Delete account");
    fireEvent.click(summary);
    expect(within(account).getByText(/all events organised by Tim/)).toBeInTheDocument();
    expect(within(account).getByLabelText('Type "Tim" to confirm')).toBeRequired();
  });

  it("shows a generated password once in the response and clears it on a later result", async () => {
    mocks.manageUserAction
      .mockResolvedValueOnce({ message: "Created.", temporaryPassword: "one-time-secret" })
      .mockResolvedValueOnce({ message: "Created another account." });
    render(<AdminUsers users={users} currentUserId={1} />);
    const form = screen.getByRole("form", { name: "Create account" });
    fireEvent.submit(form);
    expect(await screen.findByText("one-time-secret")).toBeInTheDocument();
    fireEvent.submit(form);
    await waitFor(() => expect(screen.queryByText("one-time-secret")).not.toBeInTheDocument());
  });

  it("keeps a self-reset password visible while disabling further management", async () => {
    mocks.manageUserAction.mockResolvedValue({
      message: "Password issued.", temporaryPassword: "admin-secret", signedOut: true,
    });
    render(<AdminUsers users={users} currentUserId={1} />);
    fireEvent.submit(screen.getByRole("form", { name: "Reset authentication for Admin" }));
    expect(await screen.findByText("admin-secret")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("form", { name: "Create account" })).not.toBeInTheDocument();
  });
});
