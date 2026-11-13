"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import {
  AdminValidationError,
  createManagedUser,
  deleteManagedUser,
  issueTemporaryPassword,
  resetTotp,
  updateManagedUser,
} from "@/lib/auth/admin-service";

export type AdminActionState = {
  error?: string;
  message?: string;
  temporaryPassword?: string;
  signedOut?: boolean;
};

export async function manageUserAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await requireRole(["Admin"]);
  const field = (name: string) => String(formData.get(name) ?? "");
  const operation = field("operation");

  try {
    let result: AdminActionState;
    if (operation === "create") {
      const user = await createManagedUser(field("name"), field("role"));
      result = {
        message: `${user.name} created. Share this temporary password through a trusted channel.`,
        temporaryPassword: user.temporaryPassword,
      };
    } else {
      const userId = Number(field("userId"));
      if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new AdminValidationError("Invalid user ID.");
      }
      if (operation === "update") {
        await updateManagedUser(userId, field("name"), field("role"));
        result = { message: "Account updated." };
      } else if (operation === "delete") {
        await deleteManagedUser(userId, field("confirmation"));
        result = { message: "Account and all its organised events deleted." };
      } else if (operation === "issue-password") {
        const temporaryPassword = await issueTemporaryPassword(userId);
        result = {
          message: "Temporary password issued. All sessions and setup challenges invalidated.",
          temporaryPassword,
          signedOut: userId === session.user.id,
        };
      } else if (operation === "reset-totp") {
        await resetTotp(userId);
        result = {
          message: "Authenticator reset. All sessions and setup challenges invalidated.",
          signedOut: userId === session.user.id,
        };
      } else {
        throw new AdminValidationError("Invalid account operation.");
      }
    }
    // Re-rendering a protected page after self-reset would redirect before the
    // administrator could copy their one-time temporary password.
    if (!result.signedOut) revalidatePath("/admin");
    return result;
  } catch (error) {
    if (error instanceof AdminValidationError) return { error: error.message };
    throw error;
  }
}
