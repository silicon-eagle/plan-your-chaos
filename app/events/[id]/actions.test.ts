import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/db", () => ({ db: { delete: mocks.delete } }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { deleteEvent } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteEvent", () => {
  it("deletes the event and returns to the calendar", async () => {
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
