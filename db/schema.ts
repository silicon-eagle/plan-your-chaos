import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  pgEnum,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const loginChallengeStage = pgEnum("login_challenge_stage", [
  "set_password",
  "enroll_totp",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  avatarPath: text("avatar_path"),
  passwordHash: text("password_hash"),
  mustSetPassword: boolean("must_set_password").default(false).notNull(),
  totpSecretEncrypted: text("totp_secret_encrypted"),
  totpEnabledAt: timestamp("totp_enabled_at", { withTimezone: true }),
  lastTotpCounter: integer("last_totp_counter"),
  failedLoginCount: integer("failed_login_count").default(0).notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
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

export const usersRelations = relations(users, ({ many }) => ({
  events: many(events),
  eventAttendances: many(eventAttendants),
  sessions: many(sessions),
  loginChallenges: many(loginChallenges),
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
