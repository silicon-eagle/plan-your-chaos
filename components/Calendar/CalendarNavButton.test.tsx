import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarNavButton } from "./CalendarNavButton";

describe("CalendarNavButton", () => {
  it.each([
    ["previous", "Previous month", "PrevBtn.png", "PrevBtn-hover.png"],
    ["next", "Next month", "NextBtn.png", "NextBtn-hover.png"],
  ] as const)(
    "renders the %s month sprites",
    (direction, label, defaultImage, hoverImage) => {
      render(<CalendarNavButton direction={direction} />);

      const button = screen.getByRole("button", { name: label });
      const images = button.querySelectorAll("img");

      expect(images[0]).toHaveAttribute(
        "src",
        expect.stringContaining(defaultImage),
      );
      expect(images[1]).toHaveAttribute(
        "src",
        expect.stringContaining(hoverImage),
      );
    },
  );

  it("runs the supplied click handler", () => {
    const onClick = vi.fn();
    render(<CalendarNavButton direction="next" onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
