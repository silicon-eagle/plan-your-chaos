import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  EventListClient,
  getEventStatus,
  type EventListItem,
} from "./EventListClient";
import styles from "./EventList.module.css";

const events: EventListItem[] = [
  {
    id: 1,
    title: "Dinner",
    startsAt: "2026-07-24T18:00:00.000Z",
    endsAt: "2026-07-24T19:00:00.000Z",
    allDay: false,
    icon: { id: 1, name: "Cat", fileName: "cat" },
    attendants: [
      { id: 1, name: "Tim" },
    ],
  },
  {
    id: 2,
    title: "Concert",
    startsAt: "2026-07-25T18:00:00.000Z",
    endsAt: "2026-07-25T20:00:00.000Z",
    allDay: false,
    icon: { id: 2, name: "Music", fileName: "music" },
    attendants: [
      { id: 2, name: "Veerle" },
    ],
  },
];

describe("EventListClient", () => {
  it("borders only ongoing events and removes their left stripe", () => {
    render(
      <EventListClient events={events} users={[]} currentTime="2026-07-24T18:30:00Z" />,
    );
    const ongoing = screen.getByText("Dinner").closest("li")!;
    const upcoming = screen.getByText("Concert").closest("li")!;
    expect(ongoing).toHaveClass(styles.active);
    expect(ongoing.querySelector(`.${styles.stripe}`)).toBeNull();
    expect(upcoming).not.toHaveClass(styles.active);
    expect(upcoming.querySelector(`.${styles.stripe}`)).not.toBeNull();
  });

  it.each([false, true])("shows both dates in multi-day event headers (all-day: %s)", (allDay) => {
    render(
      <EventListClient
        events={[{ ...events[0], endsAt: "2026-07-27T19:00:00Z", allDay }]}
        users={[]}
        currentTime="2026-07-24T12:00:00Z"
      />,
    );
    expect(screen.getByText("FRI 24 JUL - MON 27 JUL | Today")).toBeInTheDocument();
  });

  it.each([false, true])("shows one date for same-day events even across UTC midnight (all-day: %s)", (allDay) => {
    render(
      <EventListClient
        events={[{
          ...events[0],
          startsAt: "2026-07-24T22:30:00Z",
          endsAt: "2026-07-25T19:00:00Z",
          allDay,
        }]}
        users={[]}
        currentTime="2026-07-24T22:00:00Z"
      />,
    );
    expect(screen.getByText("SAT 25 JUL | Today")).toBeInTheDocument();
  });

  it("shows a date range when an event crosses Amsterdam midnight on the same UTC date", () => {
    render(
      <EventListClient
        events={[{
          ...events[0],
          startsAt: "2026-07-24T20:00:00Z",
          endsAt: "2026-07-24T22:30:00Z",
        }]}
        users={[]}
        currentTime="2026-07-24T19:00:00Z"
      />,
    );
    expect(screen.getByText("FRI 24 JUL - SAT 25 JUL | Today")).toBeInTheDocument();
  });

  it("alternates yellow and purple event icons", () => {
    render(
      <EventListClient
        events={events}
        users={[
          { id: 1, name: "Tim" },
          { id: 2, name: "Veerle" },
        ]}
      />,
    );

    expect(screen.getByRole("img", { name: "Cat icon" })).toHaveAttribute(
      "style",
      expect.stringContaining("/icons/yellow/cat-yellow.png"),
    );
    expect(screen.getByRole("img", { name: "Music icon" })).toHaveAttribute(
      "style",
      expect.stringContaining("/icons/yellow/music-yellow.png"),
    );
    expect(screen.getByRole("img", { name: "Cat icon" })).toHaveStyle({ backgroundColor: "#F2C900" });
    expect(screen.getByRole("img", { name: "Music icon" })).toHaveStyle({ backgroundColor: "#4B2E83" });
  });

  describe("getEventStatus", () => {
    const event = events[0];

    it("labels events later on the same Amsterdam date as today", () => {
      expect(
        getEventStatus(event, new Date("2026-07-24T12:00:00.000Z")),
      ).toBe("Today");
    });

    it("uses singular grammar for events on the next day", () => {
      expect(
        getEventStatus(events[1], new Date("2026-07-24T12:00:00.000Z")),
      ).toBe("In 1 day");
    });

    it("treats the end time as past", () => {
      expect(getEventStatus(event, new Date(event.endsAt))).toBe("Past");
    });
  });

  it("filters by one attendee and restores every event when All is selected", () => {
    render(
      <EventListClient
        events={events}
        users={[
          { id: 1, name: "Tim" },
          { id: 2, name: "Veerle" },
        ]}
      />,
    );

    const filter = screen.getByRole("combobox", { name: "Attendee" });
    expect(within(filter).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "All", "Tim", "Veerle",
    ]);
    expect(filter).toHaveValue("");
    expect(screen.queryByRole("checkbox", { name: "Tim" })).not.toBeInTheDocument();
    fireEvent.change(filter, { target: { value: "1" } });

    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.queryByText("Concert")).not.toBeInTheDocument();

    fireEvent.change(filter, { target: { value: "2" } });

    expect(screen.queryByText("Dinner")).not.toBeInTheDocument();
    expect(screen.getByText("Concert")).toBeInTheDocument();

    fireEvent.change(filter, { target: { value: "" } });
    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.getByText("Concert")).toBeInTheDocument();
  });

  it("combines icon, attendee, and upcoming filters, including icons without matching events", () => {
    render(
      <EventListClient
        events={[
          ...events,
          { ...events[0], id: 3, title: "Cat meetup", startsAt: events[1].startsAt, endsAt: events[1].endsAt, attendants: events[1].attendants },
          { ...events[0], id: 4, title: "No icon", icon: null, startsAt: events[1].startsAt, endsAt: events[1].endsAt },
        ]}
        users={[{ id: 1, name: "Tim" }, { id: 2, name: "Veerle" }]}
        icons={[
          { id: 1, name: "Cat", fileName: "cat" },
          { id: 2, name: "Music", fileName: "music" },
          { id: 3, name: "Star", fileName: "star" },
        ]}
        showIconFilter
        showUpcomingFilter
        currentTime="2026-07-24T20:00:00Z"
      />,
    );
    const attendeeFilter = screen.getByRole("combobox", { name: "Attendee" });
    function selectIcon(name: string) {
      fireEvent.click(screen.getByRole("button", { name: "Select icon" }));
      fireEvent.click(screen.getByRole("button", { name }));
    }

    selectIcon("Select Cat icon");
    expect(screen.getByText("Cat meetup")).toBeInTheDocument();
    expect(screen.queryByText("Dinner")).not.toBeInTheDocument();
    expect(screen.queryByText("Concert")).not.toBeInTheDocument();
    expect(screen.queryByText("No icon")).not.toBeInTheDocument();

    fireEvent.change(attendeeFilter, { target: { value: "1" } });
    expect(screen.getByText("No matching events.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Upcoming only" }));
    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.queryByText("Cat meetup")).not.toBeInTheDocument();

    fireEvent.change(attendeeFilter, { target: { value: "" } });
    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.getByText("Cat meetup")).toBeInTheDocument();
    selectIcon("Select Star icon");
    expect(screen.getByText("No matching events.")).toBeInTheDocument();
    selectIcon("Select all event icons");
    expect(screen.getByText("No icon")).toBeInTheDocument();
    expect(screen.getByText("Concert")).toBeInTheDocument();
  });

  it("uses the All sprite and actual event sprites with only one selected icon", () => {
    render(
      <EventListClient
        events={events}
        users={[]}
        icons={[
          { id: 1, name: "Cat", fileName: "cat" },
          { id: 2, name: "Music", fileName: "music" },
        ]}
        showIconFilter
      />,
    );
    expect(screen.queryByRole("combobox", { name: "Event icon" })).not.toBeInTheDocument();
    const picker = within(screen.getByRole("group", { name: "Event icon" }));
    const trigger = picker.getByRole("button", { name: "Select icon" });
    expect(picker.getByRole("img", { name: "All event icons" })).toHaveAttribute("src", "/icons/All.png");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    const all = picker.getByRole("button", { name: "Select all event icons" });
    const cat = picker.getByRole("button", { name: "Select Cat icon" });
    expect(all).toHaveAttribute("aria-pressed", "true");
    expect(all.querySelector("img")).toHaveAttribute("src", "/icons/All.png");
    expect(cat.querySelector("span")).toHaveAttribute("style", expect.stringContaining("/icons/yellow/cat-yellow.png"));

    fireEvent.click(cat);
    expect(picker.getByRole("img", { name: "Cat icon" })).toBeInTheDocument();
    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.queryByText("Concert")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(picker.queryByRole("button", { name: "Select Music icon" })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(picker.getByRole("button", { name: "Select Cat icon" })).toHaveAttribute("aria-pressed", "true");
    expect(picker.getByRole("button", { name: "Select all event icons" })).toHaveAttribute("aria-pressed", "false");
    expect(picker.getByRole("button", { name: "Select Music icon" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(picker.getByRole("button", { name: "Select Music icon" }));
    expect(screen.queryByText("Dinner")).not.toBeInTheDocument();
    expect(screen.getByText("Concert")).toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(picker.getByRole("button", { name: "Select all event icons" }));
    expect(picker.getByRole("img", { name: "All event icons" })).toBeInTheDocument();
    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.getByText("Concert")).toBeInTheDocument();
  });

  it("does not show an icon picker on other event lists", () => {
    render(<EventListClient events={events} users={[]} />);
    expect(screen.queryByRole("button", { name: "Select icon" })).not.toBeInTheDocument();
  });

  it("dismisses the floating picker with Escape or an outside click, but not an inside click", () => {
    render(
      <EventListClient
        events={events}
        users={[]}
        icons={[{ id: 1, name: "Cat", fileName: "cat" }]}
        showIconFilter
      />,
    );
    const trigger = screen.getByRole("button", { name: "Select icon" });
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Select Cat icon" }));
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole("combobox", { name: "Attendee" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Select Cat icon" })).not.toBeInTheDocument();
  });

  it("shows only upcoming events by default when the filter is enabled", () => {
    render(
      <EventListClient
        events={events}
        users={[]}
        showUpcomingFilter
        currentTime="2026-07-24T20:00:00.000Z"
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: "Upcoming only" }),
    ).toBeChecked();

    expect(screen.queryByText("Dinner")).not.toBeInTheDocument();
    expect(screen.getByText("Concert")).toBeInTheDocument();
  });

  it("does not show a separator between event filters", () => {
    render(
      <EventListClient
        events={events}
        users={[{ id: 1, name: "Tim" }]}
        showUpcomingFilter
      />,
    );

    expect(screen.queryByText("|")).not.toBeInTheDocument();
  });

  it("uses a deterministic three-letter September label", () => {
    render(
      <EventListClient
        events={[
          {
            ...events[0],
            startsAt: "2026-09-18T18:00:00.000Z",
            endsAt: "2026-09-18T19:00:00.000Z",
          },
        ]}
        users={[]}
        currentTime="2026-09-01T12:00:00.000Z"
      />,
    );

    expect(screen.getByText("FRI 18 SEP | In 17 days")).toBeInTheDocument();
  });

  it("optionally shows the Events image heading", () => {
    render(
      <EventListClient
        events={[]}
        users={[]}
        showHeader
      />,
    );

    expect(screen.getByRole("heading", { name: "Events" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Events" })).toHaveAttribute(
      "src",
      expect.stringContaining("/images/events-header.png"),
    );
  });
});
