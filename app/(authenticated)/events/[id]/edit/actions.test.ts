import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/authorization", () => ({
  requireSession: mocks.requireSession,
}));
vi.mock("@/db", () => ({
  db: {
    select: mocks.select,
    transaction: mocks.transaction,
  },
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { updateEvent } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateEvent", () => {
  it("rejects without any DB operation when unauthenticated", async () => {
    mocks.requireSession.mockRejectedValue(new Error("Authentication required"));

    const formData = new FormData();
    formData.set("title", "Dinner");
    formData.set("startsAt", "2026-07-23T18:00");
    formData.set("endsAt", "2026-07-23T19:00");
    formData.set("iconId", "5");

    await expect(
      updateEvent(12, { error: null }, formData),
    ).rejects.toThrow("Authentication required");

    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("updates event fields and replaces attendants", async () => {
    mocks.requireSession.mockResolvedValue({ user: { id: 1 } });
    mocks.select
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([{ id: 2 }]),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([{ id: 5 }]),
      });

    const returning = vi.fn().mockResolvedValue([{ id: 12 }]);
    const updateWhere = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where: updateWhere }));
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const attendantValues = vi.fn().mockResolvedValue(undefined);
    const transaction = {
      update: vi.fn(() => ({ set })),
      delete: vi.fn(() => ({ where: deleteWhere })),
      insert: vi.fn(() => ({ values: attendantValues })),
    };
    mocks.transaction.mockImplementation(async (callback) =>
      callback(transaction),
    );

    const formData = new FormData();
    formData.set("title", "Updated dinner");
    formData.set("startsAt", "2026-07-24T18:00");
    formData.set("endsAt", "2026-07-24T19:00");
    formData.set("iconId", "5");
    formData.append("attendantIds", "2");

    await updateEvent(12, { error: null }, formData);

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Updated dinner",
        iconId: 5,
      }),
    );
    expect(attendantValues).toHaveBeenCalledWith([
      { eventId: 12, userId: 2 },
    ]);
    expect(mocks.redirect).toHaveBeenCalledWith("/events/12");
  });
});
