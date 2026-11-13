import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EventForm } from "@/components/EventForm/EventForm";

const icons = [
  { id: 1, name: "Cat", fileName: "cat" },
  { id: 2, name: "Star", fileName: "star" },
];

describe("EventForm", () => {
  const action = vi.fn();

  it.each([false, true])("excludes Admin attendance, including saved selections (editing: %s)", (editing) => {
    const { container } = render(
      <EventForm
        action={action}
        initialDate="2026-07-24"
        users={[
          { id: 2, name: "Tim", roleId: 2 },
          { id: 3, name: "Visitor", roleId: 3 },
          { id: 4, name: "Admin", roleId: 1 },
        ]}
        activeUserId={2}
        icons={icons}
        defaultIconId={1}
        initialValues={editing ? {
          title: "Dinner", startsAt: "2026-07-24T18:00", endsAt: "2026-07-24T19:00",
          allDay: false, hidden: false, userId: 2, notes: "",
          attendantIds: [2, 3, 4], iconId: 1,
        } : undefined}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Tim" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Visitor" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Admin" })).not.toBeInTheDocument();
    expect(new FormData(container.querySelector("form")!).getAll("attendantIds")).not.toContain("4");
  });

  it("preserves the current owner and hidden flag when editing", () => {
    render(
      <EventForm
        action={action}
        initialDate="2026-07-24"
        users={[{ id: 1, name: "Tim", roleId: 2 }, { id: 2, name: "Veerle", roleId: 2 }]}
        activeUserId={1}
        icons={icons}
        defaultIconId={1}
        initialValues={{
          title: "Dinner", startsAt: "2026-07-24T18:00", endsAt: "2026-07-24T19:00",
          allDay: false, hidden: true, userId: 2, notes: "", attendantIds: [], iconId: 1,
        }}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Organiser" })).toHaveValue("2");
    expect(screen.getByRole("checkbox", { name: "Hidden from readers" })).toBeChecked();
  });

  it("offers only Users as organisers and includes hidden visibility", () => {
    render(
      <EventForm
        action={action}
        initialDate="2026-07-24"
        users={[
          { id: 1, name: "Tim", roleId: 2 },
          { id: 2, name: "Veerle", roleId: 2 },
          { id: 3, name: "Reader", roleId: 3 },
          { id: 4, name: "Admin", roleId: 1 },
        ]}
        activeUserId={1}
        icons={icons}
        defaultIconId={1}
      />,
    );
    const owner = screen.getByRole("combobox", { name: "Organiser" });
    expect(owner).toHaveValue("1");
    expect(screen.queryByRole("option", { name: "Reader" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Admin" })).not.toBeInTheDocument();
    fireEvent.change(owner, { target: { value: "2" } });
    expect(owner).toHaveValue("2");
    expect(screen.getByRole("checkbox", { name: "Hidden from readers" })).not.toBeChecked();
  });

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
      "style",
      expect.stringContaining("/icons/yellow/cat-yellow.png"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Select icon" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Select Star icon" }),
    );

    expect(screen.getByRole("img", { name: "Star icon" })).toHaveAttribute(
      "style",
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

  it("moves the end time to one hour after the selected start time", () => {
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

    fireEvent.change(screen.getByLabelText("Starts"), {
      target: { value: "2026-07-24T23:30" },
    });

    expect(screen.getByLabelText("Ends")).toHaveValue(
      "2026-07-25T00:30",
    );
  });
});
