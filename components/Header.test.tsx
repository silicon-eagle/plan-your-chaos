import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { logoutAction } from "@/app/login/actions";
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

  it("switches the default and hover sprites with the menu state", () => {
    render(
      <Header
        activeUserName="Adam"
        activeUserAvatarPath="/images/userT.png"
      />,
    );

    const menuButton = screen.getByRole("button", {
      name: "Open navigation",
    });
    expect(
      Array.from(menuButton.querySelectorAll("img")).map((image) =>
        image.getAttribute("src"),
      ),
    ).toEqual([
      expect.stringContaining("/images/menu-closed.png"),
      expect.stringContaining("/images/menu-closed-hover.png"),
    ]);

    fireEvent.click(menuButton);

    expect(
      Array.from(
        screen
          .getByRole("button", { name: "Close navigation" })
          .querySelectorAll("img"),
      ).map((image) => image.getAttribute("src")),
    ).toEqual([
      expect.stringContaining("/images/menu-open.png"),
      expect.stringContaining("/images/menu-open-hover.png"),
    ]);
  });

  it("keeps the mobile logout form mounted while logout is dispatched", async () => {
    render(
      <Header
        activeUserName="Adam"
        activeUserAvatarPath="/images/userT.png"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open navigation" }),
    );

    const mobileNavigation = document.querySelector("#mobile-navigation");
    expect(mobileNavigation).not.toBeNull();

    fireEvent.click(
      within(mobileNavigation as HTMLElement).getByRole("button", {
        name: "Logout",
      }),
    );

    expect(document.querySelector("#mobile-navigation")).toBeInTheDocument();
    await waitFor(() => expect(logoutAction).toHaveBeenCalled());
  });
});
