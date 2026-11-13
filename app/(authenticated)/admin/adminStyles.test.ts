import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminStyles = readFileSync(
  "app/(authenticated)/admin/admin.module.css",
  "utf8",
);

describe("admin account form styles", () => {
  it("aligns field labels over equally tall controls", () => {
    expect(adminStyles).toMatch(
      /\.fields\s*\{[^}]*--admin-control-height:\s*56px;/,
    );
    expect(adminStyles).toMatch(
      /\.fields[\s\S]*align-items:\s*end;/,
    );
    expect(adminStyles).toMatch(
      /\.input\s*\{[^}]*box-sizing:\s*border-box;[^}]*height:\s*var\(--admin-control-height\);/,
    );
    expect(adminStyles).toMatch(
      /\.fields button[\s\S]*box-sizing:\s*border-box;[^}]*height:\s*var\(--admin-control-height\);/,
    );
  });
});
