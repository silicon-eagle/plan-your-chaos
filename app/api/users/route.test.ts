import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const database = vi.hoisted(() => ({
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

import { GET } from "./route";

const baseSession = {
  id: 1,
  user: { id: 1, name: "Alice", avatarPath: null },
  createdAt: new Date(),
  lastActiveAt: new Date(),
  idleExpiresAt: new Date(),
  absoluteExpiresAt: new Date(),
};

beforeEach(() => {
  database.select.mockReset();
  authMocks.getSession.mockReset();
});

describe("GET /api/users", () => {
  it("returns 401 when not authenticated", async () => {
    authMocks.getSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/users"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
    expect(database.select).not.toHaveBeenCalled();
  });

  it("returns all household users", async () => {
    authMocks.getSession.mockResolvedValue(baseSession);
    const users = [
      { id: 1, name: "Adam" },
      { id: 2, name: "Eve" },
    ];
    const orderBy = vi.fn().mockResolvedValue(users);
    const from = vi.fn(() => ({ orderBy }));
    database.select.mockReturnValue({ from });

    const response = await GET(new Request("http://localhost/api/users"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ users });
  });
});
