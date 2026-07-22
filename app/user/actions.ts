"use server";

import { revalidatePath } from "next/cache";
import { setActiveUser } from "@/lib/auth/active-users";

export async function selectActiveUser(formData: FormData) {
  const name = formData.get("name");

  if (typeof name !== "string" || !name) {
    throw new Error("A user name is required");
  }

  await setActiveUser(name);
  revalidatePath("/", "layout");
}
