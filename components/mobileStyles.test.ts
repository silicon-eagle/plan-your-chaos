import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const eventFormStyles = readFileSync(
  "app/(authenticated)/events/events.module.css",
  "utf8",
);
const globalStyles = readFileSync("app/globals.css", "utf8");
const calendarButtonStyles = readFileSync(
  "components/Calendar/CalendarNavButton.module.css",
  "utf8",
);
const eventListStyles = readFileSync(
  "components/EventList/EventList.module.css",
  "utf8",
);
const pixelButtonStyles = readFileSync(
  "components/PixelButton/PixelButton.module.css",
  "utf8",
);

describe("mobile layout styles", () => {
  it("allows date-time controls to shrink inside the event form", () => {
    expect(eventFormStyles).toMatch(
      /\.dateTimeField\s*\{[^}]*min-width:\s*0;/,
    );
    expect(eventFormStyles).toMatch(/\.input\s*\{[^}]*min-width:\s*0;/);
  });

  it("keeps the create-event sprite button at its intended size", () => {
    expect(calendarButtonStyles).toMatch(
      /\.button\s*\{[^}]*flex:\s*0 0 auto;/,
    );
    expect(calendarButtonStyles).toMatch(
      /\.button\s*\{[^}]*min-width:\s*calc\(16px \* var\(--pixel-art-scale\)\);/,
    );
    expect(eventListStyles).toMatch(
      /@media\s*\(max-width:\s*42rem\)[\s\S]*\.filterRow\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/,
    );
  });

  it("renders the menu sprites at their native size", () => {
    expect(globalStyles).toMatch(
      /\.menu-icon\s*\{[^}]*width:\s*64px;[^}]*height:\s*64px;/,
    );
    expect(globalStyles).toMatch(
      /\.menu-icon-hover\s*\{[^}]*display:\s*none;/,
    );
  });

  it("maps the bars to closed and the X to open", () => {
    const hash = (path: string) =>
      createHash("sha256").update(readFileSync(path)).digest("hex");

    expect(hash("public/images/menu-closed.png")).toBe(
      "a81f16072cc1fe30da2412c6fe7b8afe77e81334b793b51337f19a3cd43fc514",
    );
    expect(hash("public/images/menu-open.png")).toBe(
      "09be45364f983d597833e94554926165fe121c04ef6667af3370dfae653c1514",
    );
  });

  it("only applies hover button fills on devices with hover input", () => {
    expect(pixelButtonStyles).toMatch(
      /@media\s*\(hover:\s*hover\)\s*\{[^}]*\.button:hover:not\(:disabled\)/,
    );
  });
});
