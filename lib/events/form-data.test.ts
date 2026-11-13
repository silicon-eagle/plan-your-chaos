import { describe, expect, it } from "vitest";
import { parseEventFormData } from "./form-data";

function form() {
  const data = new FormData();
  data.set("title", "Dinner");
  data.set("startsAt", "2026-11-13T18:00");
  data.set("endsAt", "2026-11-13T19:00");
  data.set("userId", "2");
  return data;
}

describe("event ownership and visibility form data", () => {
  it("normalizes all-day times before checking the event duration", () => {
    const data = form();
    data.set("allDay", "on");
    data.set("startsAt", "2026-11-13T19:00");
    data.set("endsAt", "2026-11-13T18:00");
    expect(parseEventFormData(data)).toMatchObject({
      data: {
        allDay: true,
        startsAt: new Date("2026-11-13T00:00"),
        endsAt: new Date("2026-11-13T23:59"),
      },
    });
  });

  it("preserves all-day start and end dates across a clock change", () => {
    const data = form();
    data.set("allDay", "on");
    data.set("startsAt", "2026-10-24T19:00");
    data.set("endsAt", "2026-10-26T18:00");
    expect(parseEventFormData(data)).toMatchObject({
      data: {
        startsAt: new Date("2026-10-24T00:00"),
        endsAt: new Date("2026-10-26T23:59"),
      },
    });
  });

  it("still rejects reversed dates for all-day events", () => {
    const data = form();
    data.set("allDay", "on");
    data.set("startsAt", "2026-11-14T00:00");
    expect(parseEventFormData(data)).toHaveProperty("error");
  });

  it("parses the selected owner and hidden checkbox", () => {
    const data = form();
    data.set("hidden", "on");
    expect(parseEventFormData(data)).toMatchObject({
      data: { userId: 2, hidden: true },
    });
  });

  it("defaults unchecked hidden to false", () => {
    expect(parseEventFormData(form())).toMatchObject({
      data: { hidden: false },
    });
  });

  it.each(["", "0", "-1", "1.5", "nope"])("rejects invalid owner %s", (value) => {
    const data = form();
    data.set("userId", value);
    expect(parseEventFormData(data)).toHaveProperty("error");
  });
});
