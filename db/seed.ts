import "dotenv/config";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import { closeDatabase, db } from "./client";
import { icons, seedInitializations, users } from "./schema";
import { hashPassword } from "../lib/auth/passwords";
import { USER_ROLE_IDS } from "../lib/auth/roles";
import { usernameMatches } from "../lib/auth/usernames";

const seedIcons = [
  { name: "Beer", fileName: "beer" },
  { name: "Car", fileName: "car" },
  { name: "Cat", fileName: "cat" },
  { name: "Chess", fileName: "chess" },
  { name: "Cocktail", fileName: "cocktail" },
  { name: "Coffee", fileName: "coffee" },
  { name: "Controller", fileName: "controller" },
  { name: "Cross", fileName: "cross" },
  { name: "Docs", fileName: "docs" },
  { name: "Food", fileName: "food" },
  { name: "Heart", fileName: "heart" },
  { name: "Helmet", fileName: "helmet" },
  { name: "Home", fileName: "home" },
  { name: "Moon", fileName: "moon" },
  { name: "Music", fileName: "music" },
  { name: "Pawn", fileName: "pawn" },
  { name: "Plane", fileName: "plane" },
  { name: "Scissors", fileName: "scissors" },
  { name: "Skull", fileName: "skull" },
  { name: "Star", fileName: "star" },
  { name: "Sword", fileName: "sword" },
];

export async function seed() {
  await db.transaction(async (tx) => {
    // Serialize bootstrap and icon upserts across simultaneous deployments.
    await tx.execute(sql`select pg_advisory_xact_lock(19011, 1)`);
    const [initialized] = await tx
      .select({ key: seedInitializations.key })
      .from(seedInitializations)
      .where(eq(seedInitializations.key, "initial-admin"))
      .limit(1);

    if (!initialized) {
      const [existingAdmin] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.roleId, USER_ROLE_IDS.Admin))
        .limit(1);

      if (!existingAdmin) {
        const [nameTaken] = await tx
          .select({ id: users.id })
          .from(users)
          .where(usernameMatches("Admin"))
          .limit(1);
        if (nameTaken) {
          throw new Error('The name "Admin" already belongs to a non-admin account. Rename it before initial Admin bootstrap.');
        }
        const password = process.env.INIT_ADMIN_PASSWORD;
        if (!password?.trim()) {
          throw new Error("INIT_ADMIN_PASSWORD is required to create the initial Admin account.");
        }
        await tx.insert(users).values({
          name: "Admin",
          roleId: USER_ROLE_IDS.Admin,
          passwordHash: await hashPassword(password),
          mustSetPassword: true,
        });
      }
      await tx.insert(seedInitializations).values({ key: "initial-admin" });
    }

    for (const icon of seedIcons) {
      const [existingIcon] = await tx
        .select({ id: icons.id })
        .from(icons)
        .where(eq(icons.name, icon.name))
        .limit(1);

      if (existingIcon) {
        await tx
          .update(icons)
          .set({ fileName: icon.fileName })
          .where(eq(icons.id, existingIcon.id));
      } else {
        await tx.insert(icons).values(icon);
      }
    }
  });
}

async function main() {
  try {
    await seed();
  } finally {
    await closeDatabase();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  });
}
