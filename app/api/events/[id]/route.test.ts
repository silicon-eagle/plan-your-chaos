import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const database = vi.hoisted(() => ({
  delete: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/db", () => ({ db: database }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/authorization", () => ({
  withApiAuthentication:
    (handler: (request: Request, ...args: unknown[]) => Promise<Response>) =>
    async (request: Request, ...args: unknown[]) => {
      const session = await authMocks.getSession();
      if (!session) {
        return Response.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }
      return handler(request, ...args, session);
    },
}));

import { DELETE, PATCH } from "./route";

const baseSession = {
  id: 1,
  user: { id: 1, name: "Alice", avatarPath: null },
  createdAt: new Date(),
  lastActiveAt: new Date(),
  idleExpiresAt: new Date(),
  absoluteExpiresAt: new Date(),
};

beforeEach(() => {
  database.delete.mockReset();
  database.select.mockReset();
  database.update.mockReset();
  authMocks.getSession.mockReset();
});

function mockEventLookup(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn(() => ({ limit }));
  return { from: vi.fn(() => ({ where })) };
}

describe("PATCH /api/events/:id", () => {
  it("returns 401 when not authenticated", async () => {
    authMocks.getSession.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost/api/events/12", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Family dinner" }),
      }),
      { params: Promise.resolve({ id: "12" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
    expect(database.select).not.toHaveBeenCalled();
    expect(database.update).not.toHaveBeenCalled();
  });

  it("partially updates an event and refreshes updatedAt", async () => {
    authMocks.getSession.mockResolvedValue(baseSession);
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
    authMocks.getSession.mockResolvedValue(baseSession);
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

  it("rejects attempts to change the event userId", async () => {
    authMocks.getSession.mockResolvedValue(baseSession);

    const response = await PATCH(
      new Request("http://localhost/api/events/12", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: 99 }),
      }),
      { params: Promise.resolve({ id: "12" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "userId cannot be changed",
    });
    expect(database.select).not.toHaveBeenCalled();
    expect(database.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the event disappears during the update", async () => {
    authMocks.getSession.mockResolvedValue(baseSession);
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
  it("returns 401 when not authenticated", async () => {
    authMocks.getSession.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/events/12", { method: "DELETE" }),
      { params: Promise.resolve({ id: "12" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
    expect(database.delete).not.toHaveBeenCalled();
  });

  it("deletes an existing event", async () => {
    authMocks.getSession.mockResolvedValue(baseSession);
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
    authMocks.getSession.mockResolvedValue(baseSession);
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
    authMocks.getSession.mockResolvedValue(baseSession);

    const response = await DELETE(
      new Request("http://localhost/api/events/nope", { method: "DELETE" }),
      { params: Promise.resolve({ id: "nope" }) },
    );

    expect(response.status).toBe(400);
    expect(database.delete).not.toHaveBeenCalled();
  });
});
