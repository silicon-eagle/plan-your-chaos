import { eq, sql } from "drizzle-orm";
import { users } from "@/db/schema";

export function usernameMatches(username: string) {
  return eq(sql`lower(${users.name})`, sql`lower(${username.trim()})`);
}
