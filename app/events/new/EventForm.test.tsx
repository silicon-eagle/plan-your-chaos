import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventForm } from "./EventForm";

const icons = [
  { id: 1, name: "Cat", fileName: "cat" },
  { id: 2, name: "Star", fileName: "star" },
];

describe("EventForm", () => {
  const action = vi.fn();

  it("shows the default yellow icon and allows another icon to be selected", () => {
    const { container } = render(
      <EventForm
        action={action}
        initialDate="2026-07-24"
        users={[]}
        activeUserId={1}
        icons={icons}
        defaultIconId={1}
      />,
    );

    expect(screen.getByRole("img", { name: "Cat icon" })).toHaveAttribute(
      "src",
      expect.stringContaining("/icons/yellow/cat-yellow.png"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Select icon" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Select Star icon" }),
    );

    expect(screen.getByRole("img", { name: "Star icon" })).toHaveAttribute(
      "src",
      expect.stringContaining("/icons/yellow/star-yellow.png"),
    );
    expect(
      container.querySelector('input[name="iconId"]'),
    ).toHaveValue("2");
  });

  it("keeps the native date-time inputs without extra buttons", () => {
    render(
      <EventForm
        action={action}
        initialDate="2026-07-24"
        users={[]}
        activeUserId={1}
        icons={icons}
        defaultIconId={1}
      />,
    );

    expect(screen.getByLabelText("Starts")).toHaveAttribute(
      "type",
      "datetime-local",
    );
    expect(screen.getByLabelText("Ends")).toHaveAttribute(
      "type",
      "datetime-local",
    );
    expect(
      screen.queryByRole("button", {
        name: /choose .* date and time/i,
      }),
    ).not.toBeInTheDocument();
  });
});
