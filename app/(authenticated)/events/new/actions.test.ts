import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: mocks.select,
    transaction: mocks.transaction,
  },
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({
  requireSession: mocks.requireSession,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { createEvent } from "./actions";

const initialCreateEventState = { error: null };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createEvent", () => {
  it("rejects without any DB operation when unauthenticated", async () => {
    mocks.requireSession.mockRejectedValue(new Error("Authentication required"));

    const formData = new FormData();
    formData.set("title", "Dinner");
    formData.set("startsAt", "2026-07-23T18:00");
    formData.set("endsAt", "2026-07-23T19:00");

    await expect(
      createEvent(initialCreateEventState, formData),
    ).rejects.toThrow("Authentication required");

    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns a validation error for an invalid timeframe", async () => {
    const formData = new FormData();
    formData.set("title", "Dinner");
    formData.set("startsAt", "2026-07-23T19:00");
    formData.set("endsAt", "2026-07-23T18:00");

    await expect(
      createEvent(initialCreateEventState, formData),
    ).resolves.toEqual({
      error: "The event must end after it starts.",
    });
  });

  it("creates an event with selected attendants and redirects", async () => {
    mocks.requireSession.mockResolvedValue({ user: { id: 2 } });
    const where = vi.fn().mockResolvedValue([{ id: 2 }, { id: 3 }]);
    mocks.select
      .mockReturnValueOnce({
        from: vi.fn(() => ({ where })),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([{ id: 5 }, { id: 6 }]),
      });

    const returning = vi.fn().mockResolvedValue([{ id: 12 }]);
    const eventValues = vi.fn(() => ({ returning }));
    const attendantValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi
      .fn()
      .mockReturnValueOnce({ values: eventValues })
      .mockReturnValueOnce({ values: attendantValues });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({ insert }),
    );

    const formData = new FormData();
    formData.set("title", "Dinner");
    formData.set("startsAt", "2026-07-23T18:00");
    formData.set("endsAt", "2026-07-23T19:00");
    formData.set("notes", "Bring dessert");
    formData.set("iconId", "5");
    formData.append("attendantIds", "2");
    formData.append("attendantIds", "3");

    await createEvent(initialCreateEventState, formData);

    expect(eventValues).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Dinner",
        userId: 2,
        notes: "Bring dessert",
        iconId: 5,
      }),
    );
    expect(attendantValues).toHaveBeenCalledWith([
      { eventId: 12, userId: 2 },
      { eventId: 12, userId: 3 },
    ]);
    expect(mocks.redirect).toHaveBeenCalledWith("/events/12");
  });
});
