import "dotenv/config";
import { eq } from "drizzle-orm";
import { closeDatabase, db } from "./client";
import { icons, users } from "./schema";

const seedUsers = [
  { name: "Tim", avatarPath: "/images/userT.png" },
  { name: "Veerle", avatarPath: "/images/userV.png" },
];

const seedIcons = [
  { name: "Car", fileName: "car" },
  { name: "Cat", fileName: "cat" },
  { name: "Coffee", fileName: "coffee" },
  { name: "Docs", fileName: "docs" },
  { name: "Moon", fileName: "moon" },
  { name: "Music", fileName: "music" },
  { name: "Pawn", fileName: "pawn" },
  { name: "Skull", fileName: "skull" },
  { name: "Star", fileName: "star" },
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

  for (const icon of seedIcons) {
    const [existingIcon] = await db
      .select({ id: icons.id })
      .from(icons)
      .where(eq(icons.name, icon.name))
      .limit(1);

    if (existingIcon) {
      await db
        .update(icons)
        .set({ fileName: icon.fileName })
        .where(eq(icons.id, existingIcon.id));
    } else {
      await db.insert(icons).values(icon);
    }
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
