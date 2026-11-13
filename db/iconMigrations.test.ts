import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("icon data migrations", () => {
  it("adds the Christmas icon idempotently for existing databases", () => {
    const migrations = readdirSync("drizzle")
      .filter((file) => file.endsWith(".sql"))
      .map((file) => readFileSync(`drizzle/${file}`, "utf8"))
      .join("\n");

    expect(migrations).toMatch(
      /insert into "icons"[\s\S]*'Christmas'[\s\S]*'christmas'/i,
    );
    expect(migrations).toMatch(
      /where not exists[\s\S]*"icons"[\s\S]*"name"[\s\S]*'Christmas'/i,
    );
  });
});
