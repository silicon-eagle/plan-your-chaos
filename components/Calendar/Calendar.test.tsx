import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Calendar } from "./Calendar";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ events: [] }), { status: 200 }),
      ),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Calendar", () => {
  it("shows the initial month and navigates across year boundaries", () => {
    render(<Calendar initialDate={new Date(2026, 0, 15)} />);

    expect(
      screen.getByRole("heading", { name: "Jan 2026" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(
      screen.getByRole("heading", { name: "Dec 2025" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(
      screen.getByRole("heading", { name: "Feb 2026" }),
    ).toBeInTheDocument();
  });

  it("returns to the current month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 24, 12));
    render(<Calendar initialDate={new Date(2026, 0, 15)} />);

    fireEvent.click(screen.getByRole("button", { name: "Current month" }));

    expect(
      screen.getByRole("heading", { name: "Jul 2026" }),
    ).toBeInTheDocument();
  });

  it("links dates to their day pages", () => {
    render(<Calendar initialDate={new Date(2026, 0, 15)} />);

    const day = screen.getByRole("link", {
      name: "Thursday, 15 January 2026",
    });
    expect(day).toHaveAttribute("href", "/day/2026-01-15");
  });

  it("shows attendee-specific markers for events planned on a day", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          events: [
            {
              startsAt: "2026-01-15T09:00:00.000Z",
              endsAt: "2026-01-15T10:00:00.000Z",
              attendants: [{ name: "Tim" }],
            },
            {
              startsAt: "2026-01-15T12:00:00.000Z",
              endsAt: "2026-01-15T13:00:00.000Z",
              attendants: [{ name: "Veerle" }],
            },
            {
              startsAt: "2026-01-15T14:00:00.000Z",
              endsAt: "2026-01-15T15:00:00.000Z",
              attendants: [{ name: "Tim" }, { name: "Veerle" }],
            },
          ],
        }),
        { status: 200 },
      ),
    );
    render(<Calendar initialDate={new Date(2026, 0, 15)} />);

    const day = await screen.findByRole("link", {
      name: "Thursday, 15 January 2026, 3 events",
    });

    await waitFor(() => {
      expect(
        day.querySelector('img[src="/icons/eventMarkerBig-tim.png"]'),
      ).toBeInTheDocument();
      expect(
        day.querySelector('img[src="/icons/eventMarkerBig-veerle.png"]'),
      ).toBeInTheDocument();
      expect(
        day.querySelector('img[src="/icons/eventMarkerBig-together.png"]'),
      ).toBeInTheDocument();
    });
  });
});
