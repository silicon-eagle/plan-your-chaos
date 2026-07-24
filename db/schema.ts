import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  avatarPath: text("avatar_path"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const icons = pgTable(
  "icons",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    fileName: text("file_name").notNull(),
  },
);

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    allDay: boolean("all_day").default(false).notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notes: text("notes"),
    iconId: integer("icon_id")
      .references(() => icons.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("events_user_id_idx").on(table.userId),
    index("events_icon_id_idx").on(table.iconId),
  ],
);

export const eventAttendants = pgTable(
  "event_attendants",
  {
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.userId] }),
    index("event_attendants_user_id_idx").on(table.userId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  events: many(events),
  eventAttendances: many(eventAttendants),
}));

export const iconsRelations = relations(icons, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ many, one }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id],
  }),
  icon: one(icons, {
    fields: [events.iconId],
    references: [icons.id],
  }),
  attendants: many(eventAttendants),
}));

export const eventAttendantsRelations = relations(
  eventAttendants,
  ({ one }) => ({
    event: one(events, {
      fields: [eventAttendants.eventId],
      references: [events.id],
    }),
    user: one(users, {
      fields: [eventAttendants.userId],
      references: [users.id],
    }),
  }),
);
