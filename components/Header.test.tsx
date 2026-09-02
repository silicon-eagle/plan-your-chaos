import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./Header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/app/login/actions", () => ({
  logoutAction: vi.fn(),
}));

describe("Header", () => {
  it("renders the page links, logout button, and marks the current page", () => {
    render(
      <Header
        activeUserName="Adam"
        activeUserAvatarPath="/images/userT.png"
      />,
    );

    expect(screen.getByRole("img", { name: "Plan Your Chaos" })).toHaveClass(
      "pixel-art",
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "/calendar",
    );
    expect(
      screen.getByRole("link", { name: "Events" }),
    ).toHaveAttribute("href", "/events");
    expect(
      screen.getByRole("button", { name: "Logout" }),
    ).toBeInTheDocument();
  });

  it("does not render a user-switch link", () => {
    render(
      <Header
        activeUserName="Adam"
        activeUserAvatarPath="/images/userT.png"
      />,
    );

    expect(
      screen.queryByRole("link", { name: /User:/ }),
    ).not.toBeInTheDocument();
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
