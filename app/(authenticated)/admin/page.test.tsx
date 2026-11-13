import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requirePageRole: vi.fn(),
  listManagedUsers: vi.fn(),
  getManagedUser: vi.fn(),
}));
vi.mock("@/lib/auth/authorization", () => ({ requirePageRole: mocks.requirePageRole }));
vi.mock("@/lib/auth/admin-service", () => ({
  listManagedUsers: mocks.listManagedUsers,
  getManagedUser: mocks.getManagedUser,
}));
vi.mock("./actions", () => ({ manageUserAction: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
}));

import AdminPage from "./page";
import AdminUserPage from "./[id]/page";
import NewAdminUserPage from "./new/page";

const user = {
  id: 2, name: "Tim", role: "User", hasPassword: true,
  mustSetPassword: false, hasTotp: true,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requirePageRole.mockResolvedValue({ user: { id: 1, role: "Admin" } });
  mocks.listManagedUsers.mockResolvedValue([user]);
  mocks.getManagedUser.mockResolvedValue(user);
});

describe("admin page", () => {
  it("requires Admin before listing authentication status", async () => {
    await AdminPage();
    expect(mocks.requirePageRole).toHaveBeenCalledWith(["Admin"]);
    expect(mocks.requirePageRole.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.listManagedUsers.mock.invocationCallOrder[0]);
  });

  it("does not fetch account data for a rejected visitor", async () => {
    mocks.requirePageRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(AdminPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.listManagedUsers).not.toHaveBeenCalled();
  });

  it("lists account links without placing management forms on the index", async () => {
    render(await AdminPage());
    expect(screen.getByRole("link", { name: /Tim/ })).toHaveAttribute("href", "/admin/2");
    expect(screen.getByRole("link", { name: "Create user" })).toHaveAttribute("href", "/admin/new");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("loads only the requested account on its own protected page", async () => {
    render(await AdminUserPage({ params: Promise.resolve({ id: "2" }) }));
    expect(mocks.requirePageRole).toHaveBeenCalledWith(["Admin"]);
    expect(mocks.requirePageRole.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.getManagedUser.mock.invocationCallOrder[0]);
    expect(mocks.getManagedUser).toHaveBeenCalledWith(2);
    expect(mocks.listManagedUsers).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Tim" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Edit Tim" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to users" })).toHaveAttribute("href", "/admin");
  });

  it.each(["0", "-1", "abc", "1.5"])("rejects invalid account URL %s without a query", async (id) => {
    await expect(AdminUserPage({ params: Promise.resolve({ id }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getManagedUser).not.toHaveBeenCalled();
  });

  it("returns not-found for an account that no longer exists", async () => {
    mocks.getManagedUser.mockResolvedValue(undefined);
    await expect(AdminUserPage({ params: Promise.resolve({ id: "2" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("keeps creation on its own protected page", async () => {
    render(await NewAdminUserPage());
    expect(mocks.requirePageRole).toHaveBeenCalledWith(["Admin"]);
    expect(screen.getByRole("form", { name: "Create account" })).toBeInTheDocument();
    expect(mocks.listManagedUsers).not.toHaveBeenCalled();
  });

  it.each(["detail", "new"])("rejects non-Admins on the %s page", async (page) => {
    mocks.requirePageRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(page === "detail"
      ? AdminUserPage({ params: Promise.resolve({ id: "2" }) })
      : NewAdminUserPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.getManagedUser).not.toHaveBeenCalled();
  });
});
