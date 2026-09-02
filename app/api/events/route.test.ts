import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const database = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
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
  requireSession: async () => {
    const session = await authMocks.getSession();
    if (!session) throw new Error("Authentication required");
    return session;
  },
}));

import { GET, POST } from "./route";

const baseSession = {
  id: 1,
  user: { id: 1, name: "Alice", avatarPath: null },
  createdAt: new Date(),
  lastActiveAt: new Date(),
  idleExpiresAt: new Date(),
  absoluteExpiresAt: new Date(),
};

beforeEach(() => {
  database.insert.mockReset();
  database.select.mockReset();
  authMocks.getSession.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/events", () => {
  it("returns 401 when not authenticated", async () => {
    authMocks.getSession.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "http://localhost/api/events?from=2026-07-22T17:00:00.000Z&to=2026-07-22T20:00:00.000Z",
      ),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
    expect(database.select).not.toHaveBeenCalled();
  });

  it("returns household events and attendants that overlap the timeframe", async () => {
    authMocks.getSession.mockResolvedValue(baseSession);
    const event = {
      id: 1,
      title: "Dinner",
      userId: 1,
      iconId: 4,
      startsAt: new Date("2026-07-22T18:00:00.000Z"),
      endsAt: new Date("2026-07-22T19:00:00.000Z"),
    };
    const orderBy = vi.fn().mockResolvedValue([event]);
    const where = vi.fn(() => ({ orderBy }));
    const from = vi.fn(() => ({ where }));
    database.select.mockReturnValueOnce({ from });

    const attendant = {
      eventId: 1,
      id: 2,
      name: "Eve",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
    };
    const attendanceOrderBy = vi.fn().mockResolvedValue([attendant]);
    const attendanceWhere = vi.fn(() => ({ orderBy: attendanceOrderBy }));
    const innerJoin = vi.fn(() => ({ where: attendanceWhere }));
    database.select.mockReturnValueOnce({
      from: vi.fn(() => ({ innerJoin })),
    });
    const icon = { id: 4, name: "Cat", fileName: "cat" };
    database.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([icon]),
      })),
    });

    const response = await GET(
      new Request(
        "http://localhost/api/events?from=2026-07-22T17:00:00.000Z&to=2026-07-22T20:00:00.000Z",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      events: [
        {
          ...event,
          startsAt: event.startsAt.toISOString(),
          endsAt: event.endsAt.toISOString(),
          icon,
          attendants: [
            {
              id: attendant.id,
              name: attendant.name,
              createdAt: attendant.createdAt.toISOString(),
            },
          ],
        },
      ],
    });
  });

  it("rejects an invalid timeframe", async () => {
    authMocks.getSession.mockResolvedValue(baseSession);

    const response = await GET(
      new Request(
        "http://localhost/api/events?from=2026-07-22T20:00:00.000Z&to=2026-07-22T17:00:00.000Z",
      ),
    );

    expect(response.status).toBe(400);
  });
});

describe("POST /api/events", () => {
  it("returns 401 when not authenticated", async () => {
    authMocks.getSession.mockResolvedValue(null);

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

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
    expect(database.insert).not.toHaveBeenCalled();
    expect(database.select).not.toHaveBeenCalled();
  });

  it("creates an event for the authenticated user without requiring body userId", async () => {
    authMocks.getSession.mockResolvedValue(baseSession);
    vi.spyOn(Math, "random").mockReturnValue(0);
    database.select
      .mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([{ id: 4 }, { id: 7 }]),
      });

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
        iconId: 4,
      }),
    );
  });

  it("ignores supplied body userId and uses the authenticated user as owner", async () => {
    authMocks.getSession.mockResolvedValue(baseSession);
    vi.spyOn(Math, "random").mockReturnValue(0);

    const ownerLimit = vi.fn().mockResolvedValue([{ id: 99 }]);
    const ownerWhere = vi.fn(() => ({ limit: ownerLimit }));
    database.select
      .mockReturnValueOnce({
        from: vi.fn(() =>
          Object.assign([{ id: 4 }, { id: 7 }], { where: ownerWhere }),
        ),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockResolvedValue([{ id: 4 }, { id: 7 }]),
      });

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
          userId: 99,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ userId: baseSession.user.id }),
    );
  });
});
