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

describe("Compose app environment", () => {
  it("forwards the secure-cookie override to the runtime container", () => {
    const compose = readFileSync(join(process.cwd(), "compose.yaml"), "utf8");
    const appService = compose.match(/\n  app:\n[\s\S]*?(?=\nvolumes:)/)?.[0];
    expect(appService).toContain(
      "AUTH_COOKIE_SECURE: ${AUTH_COOKIE_SECURE:-true}",
    );
  });
});
