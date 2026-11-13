import { relations, sql } from "drizzle-orm";
import { USER_ROLE_IDS, type UserRole } from "../lib/auth/roles";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  pgEnum,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const loginChallengeStage = pgEnum("login_challenge_stage", [
  "set_password",
  "enroll_totp",
  "verify_totp",
]);

export const userRoles = pgTable(
  "user_roles",
  {
    id: integer("id").primaryKey(),
    name: text("name").$type<UserRole>().notNull().unique(),
  },
  (table) => [
    check("user_roles_fixed", sql`(${table.id} = 1 and ${table.name} = 'Admin') or (${table.id} = 2 and ${table.name} = 'User') or (${table.id} = 3 and ${table.name} = 'Reader')`),
  ],
);

export const seedInitializations = pgTable("seed_initializations", {
  key: text("key").primaryKey(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  roleId: integer("role_id")
    .default(USER_ROLE_IDS.User)
    .notNull()
    .references(() => userRoles.id),
  passwordHash: text("password_hash"),
  mustSetPassword: boolean("must_set_password").default(false).notNull(),
  totpSecretEncrypted: text("totp_secret_encrypted"),
  totpEnabledAt: timestamp("totp_enabled_at", { withTimezone: true }),
  lastTotpCounter: integer("last_totp_counter"),
  failedLoginCount: integer("failed_login_count").default(0).notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  readerAllIcons: boolean("reader_all_icons").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  uniqueIndex("users_name_case_insensitive_unique").on(sql`lower(${table.name})`),
]);

export const icons = pgTable(
  "icons",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    fileName: text("file_name").notNull(),
  },
);

export const readerIconPermissions = pgTable(
  "reader_icon_permissions",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    iconId: integer("icon_id")
      .notNull()
      .references(() => icons.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.iconId] }),
  ],
);

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    allDay: boolean("all_day").default(false).notNull(),
    hidden: boolean("hidden").default(false).notNull(),
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

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .notNull(),
    idleExpiresAt: timestamp("idle_expires_at", { withTimezone: true })
      .notNull(),
    absoluteExpiresAt: timestamp("absolute_expires_at", {
      withTimezone: true,
    }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revocationReason: text("revocation_reason"),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_idle_expires_at_idx").on(table.idleExpiresAt),
    index("sessions_absolute_expires_at_idx").on(table.absoluteExpiresAt),
  ],
);

export const loginChallenges = pgTable(
  "login_challenges",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    stage: loginChallengeStage("stage").notNull(),
    pendingPasswordHash: text("pending_password_hash"),
    pendingTotpSecretEncrypted: text("pending_totp_secret_encrypted"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (table) => [
    index("login_challenges_user_id_idx").on(table.userId),
    index("login_challenges_expires_at_idx").on(table.expiresAt),
  ],
);

export const userRolesRelations = relations(userRoles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  role: one(userRoles, {
    fields: [users.roleId],
    references: [userRoles.id],
  }),
  events: many(events),
  eventAttendances: many(eventAttendants),
  readerIconPermissions: many(readerIconPermissions),
  sessions: many(sessions),
  loginChallenges: many(loginChallenges),
}));

export const iconsRelations = relations(icons, ({ many }) => ({
  events: many(events),
  readerPermissions: many(readerIconPermissions),
}));

export const readerIconPermissionsRelations = relations(
  readerIconPermissions,
  ({ one }) => ({
    user: one(users, {
      fields: [readerIconPermissions.userId],
      references: [users.id],
    }),
    icon: one(icons, {
      fields: [readerIconPermissions.iconId],
      references: [icons.id],
    }),
  }),
);

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

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const loginChallengesRelations = relations(
  loginChallenges,
  ({ one }) => ({
    user: one(users, {
      fields: [loginChallenges.userId],
      references: [users.id],
    }),
  }),
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type LoginChallenge = typeof loginChallenges.$inferSelect;
export type NewLoginChallenge = typeof loginChallenges.$inferInsert;
