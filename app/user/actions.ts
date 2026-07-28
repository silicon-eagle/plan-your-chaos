"use server";

import { revalidatePath } from "next/cache";
import { setActiveUser } from "@/lib/auth/active-users";
import { logger } from "@/lib/logging/logger";

export async function selectActiveUser(formData: FormData) {
  const name = formData.get("name");

  if (typeof name !== "string" || !name) {
    throw new Error("A user name is required");
  }

  const user = await setActiveUser(name);
  logger.info("active_user.selected", { userId: user.id });
  revalidatePath("/", "layout");
}
