import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventActions } from "./EventActions";

vi.mock("./actions", () => ({
  deleteEvent: vi.fn(),
}));

describe("EventActions", () => {
  it("links to editing and uses the edit and delete sprites", () => {
    render(<EventActions eventId={12} />);

    const editLink = screen.getByRole("link", { name: "Edit event" });
    const deleteButton = screen.getByRole("button", {
      name: "Delete event",
    });

    expect(editLink).toHaveAttribute("href", "/events/12/edit");
    expect(editLink.querySelectorAll("img")[0]).toHaveAttribute(
      "src",
      expect.stringContaining("editBtn.png"),
    );
    expect(deleteButton.querySelectorAll("img")[0]).toHaveAttribute(
      "src",
      expect.stringContaining("deleteBtn.png"),
    );
  });

  it("requires confirmation before showing the delete form", () => {
    render(<EventActions eventId={12} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete event" }));

    expect(
      screen.getByRole("alertdialog", { name: "Confirm deletion" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("alertdialog", { name: "Confirm deletion" }),
    ).not.toBeInTheDocument();
  });
});
