import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  select: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));

import { getActiveUser, setActiveUser } from "./active-users";

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
};

function mockWhereLookup(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn(() => ({ limit }));
  return { from: vi.fn(() => ({ where })) };
}

beforeEach(() => {
  mocks.cookies.mockReset();
  mocks.select.mockReset();
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
  mocks.cookies.mockResolvedValue(cookieStore);
});

describe("getActiveUser", () => {
  it("returns the user stored in the cookie", async () => {
    const user = { id: 2, name: "Eve" };
    cookieStore.get.mockReturnValue({ value: "2" });
    mocks.select.mockReturnValue(mockWhereLookup([user]));

    await expect(getActiveUser()).resolves.toEqual(user);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("returns the first user by name as the default without setting a cookie", async () => {
    const user = { id: 1, name: "Adam" };
    cookieStore.get.mockReturnValue(undefined);
    const limit = vi.fn().mockResolvedValue([user]);
    const orderBy = vi.fn(() => ({ limit }));
    mocks.select.mockReturnValue({
      from: vi.fn(() => ({ orderBy })),
    });

    await expect(getActiveUser()).resolves.toEqual(user);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});

describe("setActiveUser", () => {
  it("stores and returns the user with the given name", async () => {
    const user = { id: 2, name: "Eve" };
    mocks.select.mockReturnValue(mockWhereLookup([user]));

    await expect(setActiveUser("Eve")).resolves.toEqual(user);
    expect(cookieStore.set).toHaveBeenCalledWith(
      "active-user-id",
      "2",
      expect.any(Object),
    );
  });

  it("rejects an unknown user", async () => {
    mocks.select.mockReturnValue(mockWhereLookup([]));

    await expect(setActiveUser("Noah")).rejects.toThrow(
      "User not found: Noah",
    );
  });
});
