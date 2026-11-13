import "server-only";

import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { icons, readerIconPermissions, users } from "@/db/schema";
import type { EventViewer } from "./visibility";

export type EventIconOption = {
  id: number;
  name: string;
  fileName: string;
};

export async function getVisibleIconOptions(
  viewer: EventViewer,
): Promise<EventIconOption[]> {
  const query = db
    .select({
      id: icons.id,
      name: icons.name,
      fileName: icons.fileName,
    })
    .from(icons);

  if (viewer.role !== "Reader") {
    return query.orderBy(asc(icons.name));
  }

  return query
    .where(sql<boolean>`exists (
      select 1
      from ${users}
      where ${users.id} = ${viewer.id}
        and (
          ${users.readerAllIcons} = true
          or exists (
            select 1
            from ${readerIconPermissions}
            where ${readerIconPermissions.userId} = ${viewer.id}
              and ${readerIconPermissions.iconId} = ${icons.id}
          )
        )
    )`)
    .orderBy(asc(icons.name));
}
