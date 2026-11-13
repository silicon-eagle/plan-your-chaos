import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventActions } from "./EventActions";

vi.mock("./actions", () => ({
  deleteEvent: vi.fn(),
}));

describe("EventActions", () => {
  it("keeps navigation but hides editing and deletion for readers", () => {
    render(<EventActions eventId={12} previousEventId={11} nextEventId={13} canEdit={false} />);
    expect(screen.getByRole("link", { name: "Next event" })).toHaveAttribute("href", "/events/13");
    expect(screen.queryByRole("link", { name: "Edit event" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete event" })).not.toBeInTheDocument();
  });

  it("links to adjacent events, editing, and the calendar", () => {
    render(
      <EventActions
        eventId={12}
        canEdit
        previousEventId={11}
        nextEventId={13}
      />,
    );

    const previousLink = screen.getByRole("link", {
      name: "Previous event",
    });
    const editLink = screen.getByRole("link", { name: "Edit event" });
    const deleteButton = screen.getByRole("button", {
      name: "Delete event",
    });
    const nextLink = screen.getByRole("link", { name: "Next event" });
    const calendarLink = screen.getByRole("link", { name: "Calendar" });

    expect(previousLink).toHaveAttribute("href", "/events/11");
    expect(editLink).toHaveAttribute("href", "/events/12/edit");
    expect(nextLink).toHaveAttribute("href", "/events/13");
    expect(calendarLink).toHaveAttribute("href", "/");
    expect(editLink.querySelectorAll("img")[0]).toHaveAttribute(
      "src",
      expect.stringContaining("editBtn.png"),
    );
    expect(deleteButton.querySelectorAll("img")[0]).toHaveAttribute(
      "src",
      expect.stringContaining("deleteBtn.png"),
    );
  });

  it("hides navigation buttons when there are no adjacent events", () => {
    render(
      <EventActions
        eventId={12}
        canEdit
        previousEventId={null}
        nextEventId={null}
      />,
    );

    expect(
      screen.queryByRole("link", { name: "Previous event" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Next event" }),
    ).not.toBeInTheDocument();
  });

  it("requires confirmation before showing the delete form", () => {
    render(
      <EventActions
        eventId={12}
        canEdit
        previousEventId={11}
        nextEventId={13}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));

    expect(
      screen.getByRole("alertdialog", { name: "Confirm deletion" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete event" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("alertdialog", { name: "Confirm deletion" }),
    ).not.toBeInTheDocument();
  });
});
