import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "./UserAvatar";

describe("UserAvatar", () => {
  it("renders a pixel avatar image", () => {
    render(<UserAvatar name="Tim" src="/images/userT.png" />);

    expect(screen.getByRole("img", { name: "Tim avatar" })).toHaveAttribute(
      "src",
      "/images/userT.png",
    );
  });

  it("renders the user initial when no image is available", () => {
    render(<UserAvatar name="Tim" src={null} />);

    expect(screen.getByRole("img", { name: "Tim avatar" })).toHaveTextContent(
      "T",
    );
  });
});
