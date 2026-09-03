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
      /\.dateTimeField\s*\{[^}]*min-width:\s*0;/s,
    );
    expect(eventFormStyles).toMatch(/\.input\s*\{[^}]*min-width:\s*0;/s);
  });

  it("keeps the create-event sprite button at its intended size", () => {
    expect(calendarButtonStyles).toMatch(
      /\.button\s*\{[^}]*flex:\s*0 0 auto;/s,
    );
    expect(calendarButtonStyles).toMatch(
      /\.button\s*\{[^}]*min-width:\s*calc\(16px \* var\(--pixel-art-scale\)\);/s,
    );
    expect(eventListStyles).toMatch(
      /@media\s*\(max-width:\s*42rem\)[\s\S]*\.filterRow\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/s,
    );
  });

  it("gives hamburger bars visible width", () => {
    expect(globalStyles).toMatch(
      /\.menu-button span\s*\{[^}]*width:\s*100%;/s,
    );
  });

  it("only applies hover button fills on devices with hover input", () => {
    expect(pixelButtonStyles).toMatch(
      /@media\s*\(hover:\s*hover\)\s*\{[^}]*\.button:hover:not\(:disabled\)/s,
    );
  });
});
