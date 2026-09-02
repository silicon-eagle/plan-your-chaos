import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const database = vi.hoisted(() => ({
  delete: vi.fn(),
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

import { DELETE } from "./route";

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
  authMocks.getSession.mockReset();
});

describe("DELETE /api/events/:id/attendants/:userId", () => {
  it("returns 401 when not authenticated", async () => {
    authMocks.getSession.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/events/1/attendants/2", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "1", userId: "2" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
    expect(database.delete).not.toHaveBeenCalled();
  });

  it("removes the attendant from the event", async () => {
    authMocks.getSession.mockResolvedValue(baseSession);
    const returning = vi.fn().mockResolvedValue([{ userId: 2 }]);
    const where = vi.fn(() => ({ returning }));
    database.delete.mockReturnValue({ where });

    const response = await DELETE(
      new Request("http://localhost/api/events/1/attendants/2", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "1", userId: "2" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ removedUserId: 2 });
  });

  it("returns 404 when the attendance does not exist", async () => {
    authMocks.getSession.mockResolvedValue(baseSession);
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ returning }));
    database.delete.mockReturnValue({ where });

    const response = await DELETE(
      new Request("http://localhost/api/events/1/attendants/2", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "1", userId: "2" }) },
    );

    expect(response.status).toBe(404);
  });
});
