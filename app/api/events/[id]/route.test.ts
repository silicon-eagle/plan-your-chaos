import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  delete: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/db", () => ({ db: database }));

import { DELETE, PATCH } from "./route";

beforeEach(() => {
  database.delete.mockReset();
  database.select.mockReset();
  database.update.mockReset();
});

function mockEventLookup(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn(() => ({ limit }));
  return { from: vi.fn(() => ({ where })) };
}

describe("PATCH /api/events/:id", () => {
  it("partially updates an event and refreshes updatedAt", async () => {
    const existingEvent = {
      id: 12,
      title: "Dinner",
      startsAt: new Date("2026-07-22T18:00:00.000Z"),
      endsAt: new Date("2026-07-22T19:00:00.000Z"),
      userId: 1,
    };
    database.select.mockReturnValue(mockEventLookup([existingEvent]));

    const updatedEvent = { ...existingEvent, title: "Family dinner" };
    const returning = vi.fn().mockResolvedValue([updatedEvent]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    database.update.mockReturnValue({ set });

    const response = await PATCH(
      new Request("http://localhost/api/events/12", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Family dinner" }),
      }),
      { params: Promise.resolve({ id: "12" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      event: {
        ...updatedEvent,
        startsAt: updatedEvent.startsAt.toISOString(),
        endsAt: updatedEvent.endsAt.toISOString(),
      },
    });
    expect(set).toHaveBeenCalledWith({
      title: "Family dinner",
      updatedAt: expect.any(Date),
    });
  });

  it("validates the final date range", async () => {
    database.select.mockReturnValue(
      mockEventLookup([
        {
          id: 12,
          startsAt: new Date("2026-07-22T18:00:00.000Z"),
          endsAt: new Date("2026-07-22T19:00:00.000Z"),
        },
      ]),
    );

    const response = await PATCH(
      new Request("http://localhost/api/events/12", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startsAt: "2026-07-22T20:00:00.000Z" }),
      }),
      { params: Promise.resolve({ id: "12" }) },
    );

    expect(response.status).toBe(400);
    expect(database.update).not.toHaveBeenCalled();
  });

  it("rejects an unknown organizer", async () => {
    const existingEvent = {
      id: 12,
      startsAt: new Date("2026-07-22T18:00:00.000Z"),
      endsAt: new Date("2026-07-22T19:00:00.000Z"),
    };
    database.select
      .mockReturnValueOnce(mockEventLookup([existingEvent]))
      .mockReturnValueOnce(mockEventLookup([]));

    const response = await PATCH(
      new Request("http://localhost/api/events/12", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: 99 }),
      }),
      { params: Promise.resolve({ id: "12" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 when the event disappears during the update", async () => {
    database.select.mockReturnValue(
      mockEventLookup([
        {
          id: 12,
          title: "Dinner",
          startsAt: new Date("2026-07-22T18:00:00.000Z"),
          endsAt: new Date("2026-07-22T19:00:00.000Z"),
        },
      ]),
    );

    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ returning }));
    database.update.mockReturnValue({
      set: vi.fn(() => ({ where })),
    });

    const response = await PATCH(
      new Request("http://localhost/api/events/12", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Family dinner" }),
      }),
      { params: Promise.resolve({ id: "12" }) },
    );

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/events/:id", () => {
  it("deletes an existing event", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 12 }]);
    const where = vi.fn(() => ({ returning }));
    database.delete.mockReturnValue({ where });

    const response = await DELETE(
      new Request("http://localhost/api/events/12", { method: "DELETE" }),
      { params: Promise.resolve({ id: "12" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deletedEventId: 12 });
  });

  it("returns 404 when the event does not exist", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ returning }));
    database.delete.mockReturnValue({ where });

    const response = await DELETE(
      new Request("http://localhost/api/events/99", { method: "DELETE" }),
      { params: Promise.resolve({ id: "99" }) },
    );

    expect(response.status).toBe(404);
  });

  it("rejects an invalid event ID", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/events/nope", { method: "DELETE" }),
      { params: Promise.resolve({ id: "nope" }) },
    );

    expect(response.status).toBe(400);
    expect(database.delete).not.toHaveBeenCalled();
  });
});
