import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./Header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Header", () => {
  it("renders the page links and marks the current page", () => {
    render(
      <Header
        activeUserName="Adam"
        activeUserAvatarPath="/images/userT.png"
      />,
    );

    expect(screen.getByRole("img", { name: "Plan Your Chaos" })).toHaveClass(
      "pixel-art",
    );
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Upcoming Events" }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "User: Adam" })).toHaveAttribute(
      "href",
      "/user",
    );
  });

  it("opens and closes the mobile navigation", () => {
    render(
      <Header
        activeUserName="Adam"
        activeUserAvatarPath="/images/userT.png"
      />,
    );

    const menuButton = screen.getByRole("button", {
      name: "Open navigation",
    });
    fireEvent.click(menuButton);

    expect(
      screen.getByRole("button", { name: "Close navigation" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getAllByRole("navigation", { name: "Main navigation" }),
    ).toHaveLength(2);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.getByRole("button", { name: "Open navigation" }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
