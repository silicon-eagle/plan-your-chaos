import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarNowButton } from "./CalendarNowButton";

describe("CalendarNowButton", () => {
  it("renders the current-month sprites", () => {
    render(<CalendarNowButton />);

    const button = screen.getByRole("button", { name: "Current month" });
    const images = button.querySelectorAll("img");

    expect(images[0]).toHaveAttribute(
      "src",
      expect.stringContaining("currentBtn.png"),
    );
    expect(images[1]).toHaveAttribute(
      "src",
      expect.stringContaining("currentBtn-hover.png"),
    );
  });

  it("runs the supplied click handler", () => {
    const onClick = vi.fn();
    render(<CalendarNowButton onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Current month" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
