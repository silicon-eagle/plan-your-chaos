import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TotpSetupForm } from "./TotpSetupForm";

describe("TotpSetupForm", () => {
  const defaultProps = {
    action: vi.fn(),
    qrDataUrl: "data:image/png;base64,fakebase64data",
    manualSecret: "JBSWY3DPEHPK3PXP",
    isPending: false,
  };

  it("renders a QR code image with a local data URL", () => {
    render(<TotpSetupForm {...defaultProps} />);

    const qrImage = screen.getByRole("img", { name: /qr code/i });
    expect(qrImage).toBeInTheDocument();
    expect(qrImage).toHaveAttribute(
      "src",
      expect.stringMatching(/^data:/),
    );
  });

  it("does not use any external image URLs", () => {
    render(<TotpSetupForm {...defaultProps} />);

    const images = screen.queryAllByRole("img");
    for (const img of images) {
      const src = img.getAttribute("src");
      if (src) {
        expect(src).not.toMatch(/^https?:\/\//);
      }
    }
  });

  it("displays the manual secret", () => {
    render(<TotpSetupForm {...defaultProps} />);
    expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();
  });

  it("renders a verification code input", () => {
    render(<TotpSetupForm {...defaultProps} />);
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
  });

  it("renders a submit button", () => {
    render(<TotpSetupForm {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /verify/i }),
    ).toBeInTheDocument();
  });

  it("has an aria-live polite region for errors", () => {
    render(<TotpSetupForm {...defaultProps} />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("displays an error message when provided", () => {
    render(<TotpSetupForm {...defaultProps} error="Invalid verification code." />);
    expect(
      screen.getByText("Invalid verification code."),
    ).toBeInTheDocument();
  });

  it("all controls have visible labels", () => {
    render(<TotpSetupForm {...defaultProps} />);
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
  });
});
