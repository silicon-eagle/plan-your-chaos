import { beforeEach, describe, expect, it, vi } from "vitest";

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
      return handler(request, ...args);
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

function mockLookup(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn(() => ({ limit }));
  return { from: vi.fn(() => ({ where })) };
}

beforeEach(() => {
  database.insert.mockReset();
  database.select.mockReset();
  authMocks.getSession.mockReset();
});

describe("GET /api/events/:id/attendants", () => {
  it("returns 401 when not authenticated", async () => {
    authMocks.getSession.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/events/1/attendants"),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
    expect(database.select).not.toHaveBeenCalled();
  });

  it("returns the event attendants", async () => {
    authMocks.getSession.mockResolvedValue(baseSession);
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
  it("returns 401 when not authenticated", async () => {
    authMocks.getSession.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/events/1/attendants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: 2 }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
    expect(database.insert).not.toHaveBeenCalled();
    expect(database.select).not.toHaveBeenCalled();
  });

  it("adds an existing user to an existing event", async () => {
    authMocks.getSession.mockResolvedValue(baseSession);
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
    authMocks.getSession.mockResolvedValue(baseSession);
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
