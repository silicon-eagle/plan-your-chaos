import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  delete: vi.fn(),
}));

vi.mock("@/db", () => ({ db: database }));

import { DELETE } from "./route";

beforeEach(() => {
  database.delete.mockReset();
});

describe("DELETE /api/events/:id/attendants/:userId", () => {
  it("removes the attendant from the event", async () => {
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
