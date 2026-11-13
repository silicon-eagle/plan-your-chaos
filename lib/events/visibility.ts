import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { events, readerIconPermissions, users } from "@/db/schema";
import type { UserRole } from "@/lib/auth/roles";

export type EventViewer = {
  id: number;
  role: UserRole;
};

export function eventVisibility(viewer: EventViewer) {
  if (viewer.role !== "Reader") return undefined;

  return and(
    eq(events.hidden, false),
    sql<boolean>`exists (
      select 1
      from ${users}
      where ${users.id} = ${viewer.id}
        and (
          ${users.readerAllIcons} = true
          or exists (
            select 1
            from ${readerIconPermissions}
            where ${readerIconPermissions.userId} = ${viewer.id}
              and ${readerIconPermissions.iconId} = ${events.iconId}
          )
        )
    )`,
  );
}
