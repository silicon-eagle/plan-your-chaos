import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "./UserAvatar";

describe("UserAvatar", () => {
  it("derives the pixel avatar from the first letter", () => {
    render(<UserAvatar name="Tim" />);

    expect(screen.getByRole("img", { name: "Tim avatar" })).toHaveAttribute(
      "src",
      "/images/avatars/avatar_t.png",
    );
  });

  it("uses the actual uppercase W asset filename", () => {
    render(<UserAvatar name="Wendy" />);
    expect(screen.getByRole("img", { name: "Wendy avatar" })).toHaveAttribute(
      "src", "/images/avatars/avatar_W.png",
    );
  });

  it("renders the user initial when no letter sprite exists", () => {
    render(<UserAvatar name="123" />);

    expect(screen.getByRole("img", { name: "123 avatar" })).toHaveTextContent(
      "1",
    );
  });
});
