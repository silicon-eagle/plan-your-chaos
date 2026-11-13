import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DayNavigation } from "./DayNavigation";

describe("DayNavigation", () => {
  it.each([false, true])("returns to the viewed day's calendar month (can edit: %s)", (canEdit) => {
    render(
      <DayNavigation
        date={new Date(2026, 6, 31)}
        currentDate={new Date(2026, 10, 13)}
        canEdit={canEdit}
      />,
    );
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href", "/?date=2026-07-31",
    );
  });

  it("omits event creation for readers", () => {
    render(<DayNavigation date={new Date(2026, 6, 24)} canEdit={false} />);
    expect(screen.queryByRole("link", { name: "Create event" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next day" })).toBeInTheDocument();
  });

  it("links to adjacent days, today, and event creation", () => {
    render(
      <DayNavigation
        date={new Date(2026, 6, 24)}
        canEdit
        currentDate={new Date(2026, 6, 30)}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Previous day" }),
    ).toHaveAttribute("href", "/day/2026-07-23");
    expect(screen.getByRole("link", { name: "Current day" })).toHaveAttribute(
      "href",
      "/day/2026-07-30",
    );
    expect(screen.getByRole("link", { name: "Create event" })).toHaveAttribute(
      "href",
      "/events/new?date=2026-07-24",
    );
    expect(screen.getByRole("link", { name: "Next day" })).toHaveAttribute(
      "href",
      "/day/2026-07-25",
    );
  });

  it("uses each button's default and hover sprites", () => {
    render(
      <DayNavigation
        date={new Date(2026, 6, 24)}
        canEdit
        currentDate={new Date(2026, 6, 30)}
      />,
    );

    const expectedSprites = [
      ["Previous day", "prevBtn"],
      ["Current day", "currentBtn"],
      ["Create event", "newBtn"],
      ["Next day", "nextBtn"],
      ["Calendar", "calendarBtn"],
    ] as const;

    expectedSprites.forEach(([label, image]) => {
      const images = screen
        .getByRole("link", { name: label })
        .querySelectorAll("img");

      expect(images[0]).toHaveAttribute(
        "src",
        expect.stringContaining(`${image}.png`),
      );
      expect(images[1]).toHaveAttribute(
        "src",
        expect.stringContaining(`${image}-hover.png`),
      );
    });
  });
});
