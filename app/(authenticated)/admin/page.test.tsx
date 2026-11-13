import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePageRole: vi.fn(),
  listManagedUsers: vi.fn(),
}));
vi.mock("@/lib/auth/authorization", () => ({ requirePageRole: mocks.requirePageRole }));
vi.mock("@/lib/auth/admin-service", () => ({ listManagedUsers: mocks.listManagedUsers }));
vi.mock("./AdminUsers", () => ({ AdminUsers: () => null }));

import AdminPage from "./page";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requirePageRole.mockResolvedValue({ user: { id: 1, role: "Admin" } });
  mocks.listManagedUsers.mockResolvedValue([]);
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
});
