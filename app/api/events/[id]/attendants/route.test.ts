import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@/db", () => ({ db: database }));

import { GET, POST } from "./route";

function mockLookup(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn(() => ({ limit }));
  return { from: vi.fn(() => ({ where })) };
}

beforeEach(() => {
  database.insert.mockReset();
  database.select.mockReset();
});

describe("GET /api/events/:id/attendants", () => {
  it("returns the event attendants", async () => {
    database.select.mockReturnValueOnce(mockLookup([{ id: 1 }]));

    const attendants = [{ id: 2, name: "Eve" }];
    const orderBy = vi.fn().mockResolvedValue(attendants);
    const where = vi.fn(() => ({ orderBy }));
    const innerJoin = vi.fn(() => ({ where }));
    database.select.mockReturnValueOnce({
      from: vi.fn(() => ({ innerJoin })),
    });

    const response = await GET(
      new Request("http://localhost/api/events/1/attendants"),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ attendants });
  });
});

describe("POST /api/events/:id/attendants", () => {
  it("adds an existing user to an existing event", async () => {
    database.select
      .mockReturnValueOnce(mockLookup([{ id: 1 }]))
      .mockReturnValueOnce(mockLookup([{ id: 2, name: "Eve" }]));

    const returning = vi
      .fn()
      .mockResolvedValue([{ eventId: 1, userId: 2 }]);
    const onConflictDoNothing = vi.fn(() => ({ returning }));
    const values = vi.fn(() => ({ onConflictDoNothing }));
    database.insert.mockReturnValue({ values });

    const response = await POST(
      new Request("http://localhost/api/events/1/attendants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: 2 }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      attendant: { id: 2, name: "Eve" },
    });
    expect(values).toHaveBeenCalledWith({ eventId: 1, userId: 2 });
  });

  it("rejects a duplicate attendant", async () => {
    database.select
      .mockReturnValueOnce(mockLookup([{ id: 1 }]))
      .mockReturnValueOnce(mockLookup([{ id: 2, name: "Eve" }]));

    const returning = vi.fn().mockResolvedValue([]);
    const onConflictDoNothing = vi.fn(() => ({ returning }));
    database.insert.mockReturnValue({
      values: vi.fn(() => ({ onConflictDoNothing })),
    });

    const response = await POST(
      new Request("http://localhost/api/events/1/attendants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: 2 }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(409);
  });
});
