import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  EventListClient,
  getEventStatus,
  type EventListItem,
} from "./EventListClient";

const events: EventListItem[] = [
  {
    id: 1,
    title: "Dinner",
    startsAt: "2026-07-24T18:00:00.000Z",
    endsAt: "2026-07-24T19:00:00.000Z",
    allDay: false,
    icon: { id: 1, name: "Cat", fileName: "cat" },
    attendants: [
      { id: 1, name: "Tim", avatarPath: "/images/userT.png" },
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
      { id: 2, name: "Veerle", avatarPath: "/images/userV.png" },
    ],
  },
];

describe("EventListClient", () => {
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
      "src",
      expect.stringContaining("/icons/yellow/cat-yellow.png"),
    );
    expect(screen.getByRole("img", { name: "Music icon" })).toHaveAttribute(
      "src",
      expect.stringContaining("/icons/purple/music-purple.png"),
    );
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

  it("filters events by selected attendees", () => {
    render(
      <EventListClient
        events={events}
        users={[
          { id: 1, name: "Tim" },
          { id: 2, name: "Veerle" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Tim" }));

    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.queryByText("Concert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Veerle" }));

    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.getByText("Concert")).toBeInTheDocument();
  });

  it("can show only upcoming events when enabled", () => {
    render(
      <EventListClient
        events={events}
        users={[]}
        showUpcomingFilter
        currentTime="2026-07-24T20:00:00.000Z"
      />,
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Upcoming only" }),
    );

    expect(screen.queryByText("Dinner")).not.toBeInTheDocument();
    expect(screen.getByText("Concert")).toBeInTheDocument();
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
