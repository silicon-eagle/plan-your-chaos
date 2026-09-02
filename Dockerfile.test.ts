import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Dockerfile database-tools stage", () => {
  it("copies tsconfig.json so tsx can resolve path aliases", () => {
    const dockerfile = readFileSync(join(process.cwd(), "Dockerfile"), "utf8");
    const databaseToolsStage = dockerfile.match(
      /FROM base AS database-tools[\s\S]*?(?=\nFROM )/,
    )?.[0];

    expect(databaseToolsStage).toContain("COPY tsconfig.json ./");
  });
});
