import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createManagedUser: vi.fn(),
  updateManagedUser: vi.fn(),
  deleteManagedUser: vi.fn(),
  issueTemporaryPassword: vi.fn(),
  resetTotp: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({ requireRole: mocks.requireRole }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/admin-service", () => ({
  ...mocks,
  AdminValidationError: class AdminValidationError extends Error {},
}));

import { AdminValidationError } from "@/lib/auth/admin-service";
import { manageUserAction } from "./actions";

function form(operation: string, values: Record<string, string> = {}) {
  const data = new FormData();
  Object.entries({ operation, userId: "2", name: "Alice", role: "Reader", ...values })
    .forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({ user: { id: 1, role: "Admin" } });
  mocks.createManagedUser.mockResolvedValue({
    id: 2, name: "Alice", temporaryPassword: "temporary-secret",
  });
  mocks.issueTemporaryPassword.mockResolvedValue("temporary-secret");
  mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
});

describe("admin server actions", () => {
  it.each(["create", "update", "issue-password", "reset-totp", "delete"])(
    "rechecks Admin authorization before %s",
    async (operation) => {
      const forbidden = new Error("Forbidden");
      mocks.requireRole.mockRejectedValue(forbidden);
      await expect(manageUserAction({}, form(operation))).rejects.toBe(forbidden);
      expect(mocks.requireRole).toHaveBeenCalledWith(["Admin"]);
      for (const mutation of [
        mocks.createManagedUser, mocks.updateManagedUser, mocks.deleteManagedUser,
        mocks.issueTemporaryPassword, mocks.resetTotp,
      ]) expect(mutation).not.toHaveBeenCalled();
    },
  );

  it("returns a newly generated password only in the action response", async () => {
    expect(await manageUserAction({}, form("create"))).toMatchObject({
      temporaryPassword: "temporary-secret",
      createdUserId: 2,
    });
    expect(mocks.createManagedUser).toHaveBeenCalledWith("Alice", "Reader");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("does not return a previous temporary password after another operation", async () => {
    const result = await manageUserAction(
      { temporaryPassword: "old-secret" },
      form("update"),
    );
    expect(result).not.toHaveProperty("temporaryPassword");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/2");
  });

  it("returns to the user list after deleting the selected account", async () => {
    await expect(manageUserAction({}, form("delete", { confirmation: "Alice" })))
      .rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.deleteManagedUser).toHaveBeenCalledWith(2, "Alice");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/2");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });

  it.each(["", "0", "-1", "1.5", "NaN", "9007199254740992"])(
    "rejects invalid user id %s",
    async (userId) => {
      expect(await manageUserAction({}, form("reset-totp", { userId })))
        .toHaveProperty("error");
      expect(mocks.resetTotp).not.toHaveBeenCalled();
    },
  );

  it("returns expected validation errors, but not infrastructure errors", async () => {
    mocks.updateManagedUser.mockRejectedValueOnce(new AdminValidationError("Name taken"));
    expect(await manageUserAction({}, form("update"))).toEqual({ error: "Name taken" });
    const failure = new Error("Connection failed");
    mocks.updateManagedUser.mockRejectedValueOnce(failure);
    await expect(manageUserAction({}, form("update"))).rejects.toBe(failure);
  });

  it("preserves the one-time response when resetting the signed-in Admin", async () => {
    expect(await manageUserAction({}, form("issue-password", { userId: "1" })))
      .toMatchObject({ temporaryPassword: "temporary-secret", signedOut: true });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
