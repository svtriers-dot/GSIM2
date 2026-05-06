import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  uuid,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// СТАРЫЕ ТАБЛИЦЫ — индивидуальный режим (НЕ ТРОГАТЬ)
// =============================================================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const gameResults = pgTable("game_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerName: text("player_name").notNull(),
  finalCash: integer("final_cash").notNull(),
  totalRevenue: integer("total_revenue").notNull(),
  totalRmCost: integer("total_rm_cost").notNull(),
  productsSold: jsonb("products_sold").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGameResultSchema = createInsertSchema(gameResults).omit({
  id: true,
  createdAt: true,
});

export type InsertGameResult = z.infer<typeof insertGameResultSchema>;
export type GameResult = typeof gameResults.$inferSelect;

// =============================================================================
// ТРЕНЕРСКИЙ РЕЖИМ — ADR-002 (2026-05-06)
// 1 компьютер = 1 команда. Тренер — отдельная сущность.
// =============================================================================

// --- ENUMS ---

export const sessionStatusEnum = pgEnum("session_status", [
  "draft",
  "lobby",
  "running",
  "paused",
  "ended",
  "archived",
]);

export const roundStatusEnum = pgEnum("round_status", [
  "pending",
  "running",
  "paused",
  "ended",
]);

export const scenarioPresetEnum = pgEnum("scenario_preset", [
  "easy",
  "medium",
  "hard",
  "custom",
]);

export const trainerActionTypeEnum = pgEnum("trainer_action_type", [
  "broadcast",
  "annotate",
  "spotlight",
  "snapshot",
]);

export const certificateBadgeEnum = pgEnum("certificate_badge", [
  "top1",
  "top2",
  "top3",
]);

// --- trainers ---

export const trainers = pgTable(
  "trainers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    organization: varchar("organization", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("trainers_email_idx").on(t.email),
  }),
);

// --- sessions ---

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trainerId: uuid("trainer_id")
      .notNull()
      .references(() => trainers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    accessCode: varchar("access_code", { length: 6 }).notNull(),
    pin: varchar("pin", { length: 6 }),
    scenarioPreset: scenarioPresetEnum("scenario_preset").notNull().default("medium"),
    configOverrides: jsonb("config_overrides").$type<Record<string, unknown>>().default({}),
    maxTeams: integer("max_teams").notNull().default(20),
    status: sessionStatusEnum("status").notNull().default("draft"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeAccessCodeIdx: uniqueIndex("sessions_active_access_code_idx")
      .on(t.accessCode)
      .where(sql`status NOT IN ('ended', 'archived')`),
    trainerIdx: index("sessions_trainer_idx").on(t.trainerId),
    statusIdx: index("sessions_status_idx").on(t.status),
  }),
);

// --- teams ---

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 20 }).notNull(),
    factoryState: jsonb("factory_state").$type<Record<string, unknown>>().notNull().default({}),
    deviceToken: uuid("device_token").notNull().defaultRandom(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    deviceTokenIdx: uniqueIndex("teams_device_token_idx").on(t.deviceToken),
    sessionIdx: index("teams_session_idx").on(t.sessionId),
  }),
);

// --- team_members ---

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    positionInTeam: integer("position_in_team").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    teamIdx: index("team_members_team_idx").on(t.teamId),
  }),
);

// --- rounds ---

export const rounds = pgTable(
  "rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    roundNumber: integer("round_number").notNull(),
    status: roundStatusEnum("status").notNull().default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sessionRoundIdx: uniqueIndex("rounds_session_round_idx").on(
      t.sessionId,
      t.roundNumber,
    ),
  }),
);

// --- team_round_results ---

export const teamRoundResults = pgTable(
  "team_round_results",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    finalCash: integer("final_cash").notNull(),
    throughput: integer("throughput").notNull(),
    inventory: integer("inventory").notNull(),
    operatingExpense: integer("operating_expense").notNull(),
    bottleneckStationId: varchar("bottleneck_station_id", { length: 50 }),
    rankInRound: integer("rank_in_round").notNull(),
    stateSnapshot: jsonb("state_snapshot").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.teamId, t.roundId] }),
    roundIdx: index("team_round_results_round_idx").on(t.roundId),
  }),
);

// --- decisions (append-only) ---

export const decisions = pgTable(
  "decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    actionType: varchar("action_type", { length: 50 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  },
  (t) => ({
    teamRoundTimeIdx: index("decisions_team_round_time_idx").on(
      t.teamId,
      t.roundId,
      t.timestamp,
    ),
  }),
);

// --- snapshots ---

export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    roundId: uuid("round_id").references(() => rounds.id, { onDelete: "set null" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => trainers.id, { onDelete: "cascade" }),
    state: jsonb("state").$type<Record<string, unknown>>().notNull(),
    label: varchar("label", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sessionIdx: index("snapshots_session_idx").on(t.sessionId),
  }),
);

// --- trainer_actions ---

export const trainerActions = pgTable(
  "trainer_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    type: trainerActionTypeEnum("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sessionTimeIdx: index("trainer_actions_session_time_idx").on(
      t.sessionId,
      t.timestamp,
    ),
  }),
);

// --- certificates ---

export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamMemberId: uuid("team_member_id")
      .notNull()
      .references(() => teamMembers.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    scoreBreakdown: jsonb("score_breakdown").$type<Record<string, unknown>>().notNull(),
    isTop3: boolean("is_top3").notNull().default(false),
    badge: certificateBadgeEnum("badge"),
    pdfUrl: text("pdf_url"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    teamMemberIdx: index("certificates_team_member_idx").on(t.teamMemberId),
    sessionIdx: index("certificates_session_idx").on(t.sessionId),
  }),
);

// =============================================================================
// RELATIONS
// =============================================================================

export const trainersRelations = relations(trainers, ({ many }) => ({
  sessions: many(sessions),
  snapshots: many(snapshots),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  trainer: one(trainers, {
    fields: [sessions.trainerId],
    references: [trainers.id],
  }),
  teams: many(teams),
  rounds: many(rounds),
  snapshots: many(snapshots),
  trainerActions: many(trainerActions),
  certificates: many(certificates),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  session: one(sessions, {
    fields: [teams.sessionId],
    references: [sessions.id],
  }),
  members: many(teamMembers),
  results: many(teamRoundResults),
  decisions: many(decisions),
}));

export const teamMembersRelations = relations(teamMembers, ({ one, many }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  certificates: many(certificates),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  session: one(sessions, {
    fields: [rounds.sessionId],
    references: [sessions.id],
  }),
  results: many(teamRoundResults),
  decisions: many(decisions),
}));

export const teamRoundResultsRelations = relations(teamRoundResults, ({ one }) => ({
  team: one(teams, {
    fields: [teamRoundResults.teamId],
    references: [teams.id],
  }),
  round: one(rounds, {
    fields: [teamRoundResults.roundId],
    references: [rounds.id],
  }),
}));

export const decisionsRelations = relations(decisions, ({ one }) => ({
  team: one(teams, { fields: [decisions.teamId], references: [teams.id] }),
  round: one(rounds, { fields: [decisions.roundId], references: [rounds.id] }),
}));

export const snapshotsRelations = relations(snapshots, ({ one }) => ({
  session: one(sessions, {
    fields: [snapshots.sessionId],
    references: [sessions.id],
  }),
  round: one(rounds, { fields: [snapshots.roundId], references: [rounds.id] }),
  trainer: one(trainers, {
    fields: [snapshots.createdBy],
    references: [trainers.id],
  }),
}));

export const trainerActionsRelations = relations(trainerActions, ({ one }) => ({
  session: one(sessions, {
    fields: [trainerActions.sessionId],
    references: [sessions.id],
  }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  teamMember: one(teamMembers, {
    fields: [certificates.teamMemberId],
    references: [teamMembers.id],
  }),
  session: one(sessions, {
    fields: [certificates.sessionId],
    references: [sessions.id],
  }),
}));

// =============================================================================
// ZOD SCHEMAS (для API валидации)
// =============================================================================

export const trainerRegisterSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(255),
  organization: z.string().max(255).optional(),
});
export type TrainerRegisterInput = z.infer<typeof trainerRegisterSchema>;

export const trainerLoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(128),
});
export type TrainerLoginInput = z.infer<typeof trainerLoginSchema>;

export const createSessionSchema = z.object({
  name: z.string().min(3).max(255),
  scenarioPreset: z.enum(["easy", "medium", "hard", "custom"]).default("medium"),
  configOverrides: z.record(z.unknown()).optional(),
  maxTeams: z.number().int().min(1).max(100).default(20),
  pin: z.string().regex(/^\d{4,6}$/).optional(),
  expiresInHours: z.number().int().min(1).max(168).default(24),
});
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const teamJoinSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{6}$/),
  pin: z.string().regex(/^\d{4,6}$/).optional(),
  teamName: z.string().min(1).max(100),
  members: z
    .array(z.object({ fullName: z.string().min(2).max(255) }))
    .min(1)
    .max(10),
});
export type TeamJoinInput = z.infer<typeof teamJoinSchema>;

export const teamMembersUpdateSchema = z.object({
  members: z
    .array(z.object({ fullName: z.string().min(2).max(255) }))
    .min(1)
    .max(10),
});

export const gameActionSchema = z.object({
  actionType: z.enum([
    "place_machine",
    "remove_machine",
    "set_priority",
    "start_production",
    "stop_production",
    "set_buffer",
  ]),
  payload: z.record(z.unknown()),
});
export type GameActionInput = z.infer<typeof gameActionSchema>;

export const broadcastSchema = z.object({
  message: z.string().min(1).max(500),
});

export const annotateSchema = z.object({
  stationId: z.string().min(1).max(50),
  text: z.string().min(1).max(255),
  durationMs: z.number().int().min(1000).max(60000).default(10000),
});

export const spotlightSchema = z.object({
  teamId: z.string().uuid(),
  durationMs: z.number().int().min(1000).max(120000).default(30000),
});

export const snapshotSchema = z.object({
  label: z.string().min(1).max(255),
});

export const kickSchema = z.object({
  teamId: z.string().uuid(),
  reason: z.string().max(255).optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Trainer = typeof trainers.$inferSelect;
export type InsertTrainer = typeof trainers.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;
export type Round = typeof rounds.$inferSelect;
export type InsertRound = typeof rounds.$inferInsert;
export type TeamRoundResult = typeof teamRoundResults.$inferSelect;
export type Decision = typeof decisions.$inferSelect;
export type Snapshot = typeof snapshots.$inferSelect;
export type TrainerAction = typeof trainerActions.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
