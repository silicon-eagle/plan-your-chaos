import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  delete: vi.fn(),
}));

vi.mock("@/db", () => ({ db: database }));

import { DELETE } from "./route";

beforeEach(() => {
  database.delete.mockReset();
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
