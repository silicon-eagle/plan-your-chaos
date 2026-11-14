import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEventsInRange: vi.fn(),
}));

vi.mock("@/lib/events/queries", () => ({
  getEventsInRange: mocks.getEventsInRange,
}));

import { UpdateList } from "./UpdateList";

const event = {
  id: 1,
  title: "New dinner",
  startsAt: new Date("2027-07-24T18:00:00Z"),
  endsAt: new Date("2027-07-24T19:00:00Z"),
  allDay: false,
  hidden: false,
  userId: 2,
  notes: null,
  iconId: 1,
  icon: { id: 1, name: "Cat", fileName: "cat" },
  attendants: [{ id: 2, name: "Tim", createdAt: new Date("2026-01-01") }],
  createdAt: new Date("2026-11-12T12:00:00Z"),
  updatedAt: new Date("2026-11-12T12:00:00Z"),
};

beforeEach(() => {
  mocks.getEventsInRange.mockResolvedValue([
    event,
    {
      ...event,
      id: 2,
      title: "Updated concert",
      startsAt: new Date("2025-01-01T18:00:00Z"),
      endsAt: new Date("2025-01-01T19:00:00Z"),
      updatedAt: new Date("2026-11-13T12:00:00Z"),
    },
    {
      ...event,
      id: 3,
      title: "Older update",
      createdAt: new Date("2026-11-01T12:00:00Z"),
      updatedAt: new Date("2026-11-11T12:00:00Z"),
    },
  ]);
});

describe("UpdateList", () => {
  it("orders cards by latest update, not event date, including past events", async () => {
    render(await UpdateList());

    expect(screen.getAllByRole("listitem").map((item) =>
      within(item).getByRole("link").getAttribute("href"),
    )).toEqual(["/events/2", "/events/1", "/events/3"]);
    expect(screen.getByRole("img", { name: "Updates" })).toHaveAttribute(
      "src", expect.stringContaining("/images/updates-header.png"),
    );
    expect(screen.queryByLabelText("Attendee")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Upcoming only")).not.toBeInTheDocument();
  });

  it("classifies equal timestamp values as new and different values as updated", async () => {
    render(await UpdateList());

    const newCard = screen.getByText("New dinner").closest("li")!;
    expect(within(newCard).getByRole("img", { name: "New" })).toHaveAttribute(
      "src", expect.stringContaining("/images/badge-new.png"),
    );
    const updatedCard = screen.getByText("Updated concert").closest("li")!;
    expect(within(updatedCard).getByRole("img", { name: "Updated" })).toHaveAttribute(
      "src", expect.stringContaining("/images/badge-update.png"),
    );
  });

  it("filters categories independently and handles neither selected", async () => {
    render(await UpdateList());
    const newFilter = screen.getByRole("checkbox", { name: "New" });
    const updatesFilter = screen.getByRole("checkbox", { name: "Updates" });
    expect(newFilter).toBeChecked();
    expect(updatesFilter).toBeChecked();

    fireEvent.click(updatesFilter);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("New dinner")).toBeInTheDocument();

    fireEvent.click(updatesFilter);
    fireEvent.click(newFilter);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText("New dinner")).not.toBeInTheDocument();

    fireEvent.click(updatesFilter);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText("No matching events.")).toBeInTheDocument();
  });

  it("shows the creation or latest update timestamp in Amsterdam local time", async () => {
    render(await UpdateList());

    const newCard = screen.getByText("New dinner").closest("li")!;
    const createdTime = within(newCard).getByText("Created: 12/11/26, 13:00");
    expect(createdTime.tagName).toBe("TIME");
    expect(createdTime).toHaveAttribute("datetime", "2026-11-12T12:00:00.000Z");

    const updatedCard = screen.getByText("Updated concert").closest("li")!;
    const updatedTime = within(updatedCard).getByText("Updated: 13/11/26, 13:00");
    expect(updatedTime.tagName).toBe("TIME");
    expect(updatedTime).toHaveAttribute("datetime", "2026-11-13T12:00:00.000Z");
    expect(within(updatedCard).queryByText(/Created:/)).not.toBeInTheDocument();
  });

  it("propagates data access failures rather than rendering an empty list", async () => {
    mocks.getEventsInRange.mockRejectedValue(new Error("Authentication required"));
    await expect(UpdateList()).rejects.toThrow("Authentication required");
  });
});
