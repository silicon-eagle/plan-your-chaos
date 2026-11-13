import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findSessionByToken: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/cookies", () => ({ getSessionToken: async () => "token" }));
vi.mock("@/lib/auth/sessions", () => ({ findSessionByToken: mocks.findSessionByToken }));
vi.mock("@/db", () => ({ db: mocks }));

import { POST as createEvent } from "./route";
import { PATCH as updateEvent, DELETE as deleteEvent } from "./[id]/route";
import { POST as addAttendant } from "./[id]/attendants/route";
import { DELETE as removeAttendant } from "./[id]/attendants/[userId]/route";
import { createEvent as createAction } from "@/app/(authenticated)/events/new/actions";
import { updateEvent as updateAction } from "@/app/(authenticated)/events/[id]/edit/actions";
import { deleteEvent as deleteAction } from "@/app/(authenticated)/events/[id]/actions";
import NewEventPage from "@/app/(authenticated)/events/new/page";
import EditEventPage from "@/app/(authenticated)/events/[id]/edit/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findSessionByToken.mockResolvedValue({
    user: { id: 3, name: "Reader", role: "Reader" },
  });
});

describe("Reader permissions across event entry points", () => {
  it("denies direct navigation to new and edit forms before loading data", async () => {
    await expect(NewEventPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    await expect(EditEventPage({ params: Promise.resolve({ id: "1" }) })).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("denies every mutation API before database access", async () => {
    const request = (method: string) => new Request("https://calendar.test/api/events/1", {
      method,
      headers: { Origin: "https://calendar.test" },
    });
    const context = { params: Promise.resolve({ id: "1", userId: "3" }) };
    const results = await Promise.all([
      createEvent(request("POST")),
      updateEvent(request("PATCH"), context),
      deleteEvent(request("DELETE"), context),
      addAttendant(request("POST"), context),
      removeAttendant(request("DELETE"), context),
    ]);
    expect(results.map(({ status }) => status)).toEqual([403, 403, 403, 403, 403]);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("denies direct Server Actions even with an empty form", async () => {
    await expect(createAction({ error: null }, new FormData())).rejects.toThrow("Forbidden");
    await expect(updateAction(1, { error: null }, new FormData())).rejects.toThrow("Forbidden");
    await expect(deleteAction(new FormData())).rejects.toThrow("Forbidden");
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
