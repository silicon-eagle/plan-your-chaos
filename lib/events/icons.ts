import "server-only";

import { db } from "@/db";
import { icons } from "@/db/schema";

export type EventIcon = {
  id: number;
  name: string;
  fileName: string;
};

export function chooseRandomIcon<T>(availableIcons: T[]): T {
  if (availableIcons.length === 0) {
    throw new Error("No event icons are available");
  }

  return availableIcons[Math.floor(Math.random() * availableIcons.length)];
}

export async function resolveEventIconId(value: unknown) {
  const availableIcons = await db
    .select({ id: icons.id })
    .from(icons);

  if (value === undefined || value === null || value === "") {
    return chooseRandomIcon(availableIcons).id;
  }

  const iconId = typeof value === "string" ? Number(value) : value;

  if (
    typeof iconId !== "number" ||
    !Number.isInteger(iconId) ||
    iconId <= 0
  ) {
    return null;
  }

  return availableIcons.some((icon) => icon.id === iconId) ? iconId : null;
}
