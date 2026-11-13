import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ManagedUser } from "@/lib/auth/admin-service";

const mocks = vi.hoisted(() => ({
  manageUserAction: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("./actions", () => ({ manageUserAction: mocks.manageUserAction }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

import { AdminUserForm } from "./AdminUserForm";

const users: ManagedUser[] = [
  { id: 1, name: "Admin", role: "Admin", hasPassword: true, mustSetPassword: false, hasTotp: true, readerAllIcons: true, readerIconIds: [] },
  { id: 2, name: "Tim", role: "User", hasPassword: false, mustSetPassword: false, hasTotp: false, readerAllIcons: true, readerIconIds: [] },
  { id: 3, name: "Visitor", role: "Reader", hasPassword: true, mustSetPassword: true, hasTotp: false, readerAllIcons: false, readerIconIds: [4] },
];
const icons = [
  { id: 4, name: "Music", fileName: "music" },
  { id: 7, name: "Christmas", fileName: "christmas" },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe("admin account management", () => {
  it("offers only User/Reader creation choices on the creation form", () => {
    render(<AdminUserForm currentUserId={1} />);
    const create = screen.getByRole("form", { name: "Create account" });
    expect(within(create).getAllByRole("option").map((option) => option.textContent))
      .toEqual(["User", "Reader"]);
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("shows setup status and management controls only for the selected user", () => {
    const { container } = render(<AdminUserForm user={users[1]} currentUserId={1} />);
    expect(screen.getByText("No password issued")).toBeInTheDocument();
    expect(screen.getByText("Authenticator not enrolled")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Create account" })).not.toBeInTheDocument();
    expect(screen.queryByText("Visitor")).not.toBeInTheDocument();
    for (const form of container.querySelectorAll("form")) {
      expect(new FormData(form).get("userId")).toBe("2");
    }
  });

  it("never offers Admin rename, demotion, or deletion controls", () => {
    render(<AdminUserForm user={users[0]} currentUserId={1} />);
    const admin = screen.getByRole("article", { name: "Admin" });
    expect(within(admin).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(admin).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(admin).queryByText("Delete account")).not.toBeInTheDocument();
    expect(within(admin).getByText(/signs you out/)).toBeInTheDocument();
  });

  it("requires named confirmation and warns about cascading event deletion", () => {
    render(<AdminUserForm user={users[1]} currentUserId={1} />);
    const account = screen.getByRole("article", { name: "Tim" });
    const summary = within(account).getByText("Delete account");
    fireEvent.click(summary);
    expect(within(account).getByText(/all events organised by Tim/)).toBeInTheDocument();
    expect(within(account).getByLabelText('Type "Tim" to confirm')).toBeRequired();
  });

  it("shows a generated password once in the response and clears it on a later result", async () => {
    mocks.manageUserAction
      .mockResolvedValueOnce({ message: "Created.", temporaryPassword: "one-time-secret", createdUserId: 2 })
      .mockResolvedValueOnce({ message: "Created another account." });
    render(<AdminUserForm currentUserId={1} />);
    const form = screen.getByRole("form", { name: "Create account" });
    fireEvent.submit(form);
    expect(await screen.findByText("one-time-secret")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage account" })).toHaveAttribute("href", "/admin/2");
    fireEvent.submit(form);
    await waitFor(() => expect(screen.queryByText("one-time-secret")).not.toBeInTheDocument());
  });

  it("keeps a self-reset password visible while disabling further management", async () => {
    mocks.manageUserAction.mockResolvedValue({
      message: "Password issued.", temporaryPassword: "admin-secret", signedOut: true,
    });
    render(<AdminUserForm user={users[0]} currentUserId={1} />);
    fireEvent.submit(screen.getByRole("form", { name: "Reset authentication for Admin" }));
    expect(await screen.findByText("admin-secret")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("shows actual icon images and selected grants for an existing Reader", () => {
    render(
      <AdminUserForm
        user={users[2]}
        currentUserId={1}
        icons={icons}
      />,
    );

    expect(screen.getByRole("group", { name: "Reader event visibility" }))
      .toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Music icon" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Christmas icon" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Music icon permission" }))
      .toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Christmas icon permission" }))
      .not.toBeChecked();
  });

  it("disables individual icon choices when All icons is selected", () => {
    render(
      <AdminUserForm
        user={{ ...users[2], readerAllIcons: true, readerIconIds: [] }}
        currentUserId={1}
        icons={icons}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "All icons" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Music icon permission" }))
      .toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Christmas icon permission" }))
      .toBeDisabled();
  });

  it("forces All icons on the first save when changing User to Reader", () => {
    render(
      <AdminUserForm user={users[1]} currentUserId={1} icons={icons} />,
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Reader" },
    });

    expect(screen.getByText("Save as Reader before restricting icons."))
      .toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "All icons" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Music icon permission" }))
      .toBeDisabled();
  });

  it("submits selected icon ids from the image grid", () => {
    render(
      <AdminUserForm
        user={users[2]}
        currentUserId={1}
        icons={icons}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", {
      name: "Christmas icon permission",
    }));

    const form = screen.getByRole("form", { name: "Edit Visitor" });
    expect(form).toBeInstanceOf(HTMLFormElement);
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("Missing edit form");
    }
    expect(new FormData(form).getAll("readerIconIds")).toEqual(["4", "7"]);
  });

  it("refreshes the current account page after a successful update", async () => {
    mocks.manageUserAction.mockResolvedValue({
      message: "Account updated.",
      updatedUserId: 3,
    });
    render(
      <AdminUserForm
        user={users[2]}
        currentUserId={1}
        icons={icons}
      />,
    );

    fireEvent.submit(screen.getByRole("form", { name: "Edit Visitor" }));

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  });
});
