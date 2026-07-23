import "dotenv/config";
import { closeDatabase, db } from "./client";
import { users } from "./schema";

const seedUsers = [
  { name: "Tim", avatarPath: "/images/userT.png" },
  { name: "Veerle", avatarPath: "/images/userV.png" },
];

export async function seed() {
  for (const user of seedUsers) {
    await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.name,
        set: { avatarPath: user.avatarPath },
      });
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
