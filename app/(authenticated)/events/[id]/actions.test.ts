import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  delete: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/authorization", () => ({
  requireSession: mocks.requireSession,
}));
vi.mock("@/db", () => ({ db: { delete: mocks.delete } }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { deleteEvent } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteEvent", () => {
  it("rejects without any DB operation when unauthenticated", async () => {
    mocks.requireSession.mockRejectedValue(new Error("Authentication required"));

    const formData = new FormData();
    formData.set("eventId", "12");

    await expect(deleteEvent(formData)).rejects.toThrow(
      "Authentication required",
    );

    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("deletes the event and returns to the calendar", async () => {
    mocks.requireSession.mockResolvedValue({ user: { id: 1 } });
    const returning = vi.fn().mockResolvedValue([{ id: 12 }]);
    const where = vi.fn(() => ({ returning }));
    mocks.delete.mockReturnValue({ where });
    const formData = new FormData();
    formData.set("eventId", "12");

    await deleteEvent(formData);

    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });
});
