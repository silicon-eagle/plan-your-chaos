export type UserRole = "Admin" | "User" | "Reader";

export const USER_ROLE_IDS = { Admin: 1, User: 2, Reader: 3 } as const;

export function canEditEvents(role: UserRole): boolean {
  return role === "User";
}
