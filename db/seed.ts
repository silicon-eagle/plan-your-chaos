import "dotenv/config";
import { inArray } from "drizzle-orm";
import { closeDatabase, db } from "./index";
import { users } from "./schema";

const seedUsers = [{ name: "Tim" }, { name: "Veerle" }];

export async function seed() {
  const names = seedUsers.map(({ name }) => name);
  const existingUsers = await db
    .select({ name: users.name })
    .from(users)
    .where(inArray(users.name, names));
  const existingNames = new Set(existingUsers.map(({ name }) => name));
  const missingUsers = seedUsers.filter(({ name }) => !existingNames.has(name));

  if (missingUsers.length > 0) {
    await db.insert(users).values(missingUsers);
  }
}

async function main() {
  try {
    await seed();
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  console.error("Database seed failed:", error);
  process.exitCode = 1;
});
