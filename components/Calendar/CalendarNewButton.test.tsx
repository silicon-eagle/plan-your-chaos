import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarNewButton } from "./CalendarNewButton";

describe("CalendarNewButton", () => {
  it("links to event creation with default and hover sprites", () => {
    render(<CalendarNewButton />);

    const link = screen.getByRole("link", { name: "Create event" });
    const images = link.querySelectorAll("img");

    expect(link).toHaveAttribute("href", "/events/new");
    expect(images[0]).toHaveAttribute(
      "src",
      expect.stringContaining("newBtn.png"),
    );
    expect(images[1]).toHaveAttribute(
      "src",
      expect.stringContaining("newBtn-hover.png"),
    );
  });
});
