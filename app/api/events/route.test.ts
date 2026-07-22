import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/db", () => ({ db: database }));

import { GET, POST } from "./route";

beforeEach(() => {
  database.insert.mockReset();
  database.select.mockReset();
});

describe("GET /api/events", () => {
  it("returns events owned by the user that overlap the timeframe", async () => {
    const event = {
      id: 1,
      title: "Dinner",
      userId: 1,
      startsAt: new Date("2026-07-22T18:00:00.000Z"),
      endsAt: new Date("2026-07-22T19:00:00.000Z"),
    };
    const orderBy = vi.fn().mockResolvedValue([event]);
    const where = vi.fn(() => ({ orderBy }));
    const from = vi.fn(() => ({ where }));
    database.select.mockReturnValue({ from });

    const response = await GET(
      new Request(
        "http://localhost/api/events?userId=1&from=2026-07-22T17:00:00.000Z&to=2026-07-22T20:00:00.000Z",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      events: [
        {
          ...event,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
        },
      ],
    });
  });

  it("rejects an invalid timeframe", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/events?userId=1&from=2026-07-22T20:00:00.000Z&to=2026-07-22T17:00:00.000Z",
      ),
    );

    expect(response.status).toBe(400);
  });
});

describe("POST /api/events", () => {
  it("creates an event for an existing user", async () => {
    const limit = vi.fn().mockResolvedValue([{ id: 1 }]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    database.select.mockReturnValue({ from });

    const createdEvent = { id: 1, title: "Dinner", userId: 1 };
    const returning = vi.fn().mockResolvedValue([createdEvent]);
    const values = vi.fn(() => ({ returning }));
    database.insert.mockReturnValue({ values });

    const response = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Dinner",
          startsAt: "2026-07-22T18:00:00.000Z",
          endsAt: "2026-07-22T19:00:00.000Z",
          userId: 1,
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ event: createdEvent });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Dinner",
        userId: 1,
        allDay: false,
        notes: null,
      }),
    );
  });

  it("rejects events with an unknown owner", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    database.select.mockReturnValue({ from });

    const response = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Dinner",
          startsAt: "2026-07-22T18:00:00.000Z",
          endsAt: "2026-07-22T19:00:00.000Z",
          userId: 99,
        }),
      }),
    );

    expect(response.status).toBe(404);
  });
});
