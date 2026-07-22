import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock("@/db", () => ({ db: database }));

import { GET } from "./route";

beforeEach(() => {
  database.select.mockReset();
});

describe("GET /api/users", () => {
  it("returns all household users", async () => {
    const users = [
      { id: 1, name: "Adam" },
      { id: 2, name: "Eve" },
    ];
    const orderBy = vi.fn().mockResolvedValue(users);
    const from = vi.fn(() => ({ orderBy }));
    database.select.mockReturnValue({ from });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ users });
  });
});
