import assert from "node:assert/strict";
import test from "node:test";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  trainerRegisterSchema, trainerLoginSchema, createSessionSchema,
  teamJoinSchema, teamMembersUpdateSchema, gameActionSchema,
  triggerForcedEventSchema, auditLogQuerySchema, submitQuizSchema,
  insertUserSchema, insertGameResultSchema,
} from "../shared/schema";

const trainer = { email: "Trainer+test@EXAMPLE.ORG", password: "Synthetic-password", name: "Тестовый тренер", legalAccepted: true };
const team = { code: "12345", teamName: "Тестовая команда", members: [{ fullName: "Тестовый участник" }], dataBasisConfirmed: true };

test("registration normalizes email and keeps explicit legal consent", () => {
  const parsed = trainerRegisterSchema.parse(trainer);
  assert.equal(parsed.email, "trainer+test@example.org");
  assert.equal(parsed.publicProfileConsent, false);
  for (const patch of [{ legalAccepted: false }, { legalAccepted: undefined }, { password: "short" }, { password: "x".repeat(129) }, { email: "invalid" }]) {
    assert.equal(trainerRegisterSchema.safeParse({ ...trainer, ...patch }).success, false);
  }
});
test("login rejects missing passwords and preserves normalized email", () => {
  assert.equal(trainerLoginSchema.parse({ email: trainer.email, password: "x" }).email, "trainer+test@example.org");
  assert.equal(trainerLoginSchema.safeParse({ email: trainer.email, password: "" }).success, false);
});
test("session defaults and optional record payload survive the Zod migration", () => {
  const defaults = createSessionSchema.parse({ name: "Проверка" });
  assert.deepEqual(defaults, { name: "Проверка", scenarioPreset: "medium", maxTeams: 20, expiresInHours: 24 });
  const configOverrides = { station: { enabled: true }, demand: 10, notes: null };
  assert.deepEqual(createSessionSchema.parse({ name: "Проверка", configOverrides }).configOverrides, configOverrides);
  for (const configOverrides of [null, [], "invalid"]) assert.equal(createSessionSchema.safeParse({ name: "Проверка", configOverrides }).success, false);
});
test("session numeric and PIN limits remain enforced", () => {
  for (const patch of [{ maxTeams: 0 }, { maxTeams: 101 }, { maxTeams: 1.5 }, { expiresInHours: 169 }, { pin: "abc" }]) {
    assert.equal(createSessionSchema.safeParse({ name: "Проверка", ...patch }).success, false);
  }
});
test("team consent and the one-to-five participant limit remain enforced", () => {
  assert.equal(teamJoinSchema.safeParse(team).success, true);
  assert.equal(teamJoinSchema.safeParse({ ...team, dataBasisConfirmed: false }).success, false);
  assert.equal(teamJoinSchema.safeParse({ ...team, members: [] }).success, false);
  assert.equal(teamJoinSchema.safeParse({ ...team, members: Array(6).fill(team.members[0]) }).success, false);
  assert.equal(teamMembersUpdateSchema.safeParse({ members: team.members }).success, true);
});
test("oversized participant collections reject without thousands of child errors", () => {
  const parsed = teamJoinSchema.safeParse({ ...team, members: Array.from({ length: 10_000 }, () => ({ fullName: "" })) });
  assert.equal(parsed.success, false);
  if (!parsed.success) assert.ok(parsed.error.issues.length < 10);
});
test("nested error format remains compatible with existing API clients", () => {
  const parsed = teamJoinSchema.safeParse({ ...team, members: [{ fullName: "" }] });
  assert.equal(parsed.success, false);
  if (!parsed.success) assert.ok(parsed.error.format().members?.[0]?.fullName?._errors.length);
});
test("game and forced-event records accept nested JSON values", () => {
  const payload = { machineId: "A1", options: { active: true }, quantity: 4, nullable: null };
  assert.deepEqual(gameActionSchema.parse({ actionType: "place_machine", payload }).payload, payload);
  assert.deepEqual(triggerForcedEventSchema.parse({ type: "machine_breakdown", payload }).payload, payload);
  assert.equal(gameActionSchema.safeParse({ actionType: "unknown", payload }).success, false);
});
test("audit pagination defaults and query coercion remain compatible", () => {
  assert.deepEqual(auditLogQuerySchema.parse({}), { limit: 100, offset: 0 });
  assert.deepEqual(auditLogQuerySchema.parse({ limit: "25", offset: "10" }), { limit: 25, offset: 10 });
  assert.equal(auditLogQuerySchema.safeParse({ limit: "501" }).success, false);
});
test("quiz requires exactly seven bounded integer answers", () => {
  assert.equal(submitQuizSchema.safeParse({ answers: Array(7).fill(1) }).success, true);
  for (const answers of [Array(6).fill(1), Array(8).fill(1), [11, 1, 1, 1, 1, 1, 1]]) assert.equal(submitQuizSchema.safeParse({ answers }).success, false);
});
test("generated Drizzle insert schemas validate existing payload contracts", () => {
  assert.deepEqual(insertUserSchema.parse({ username: "synthetic", password: "hash", id: "forged" }), { username: "synthetic", password: "hash" });
  const result = { playerName: "Проверка", finalCash: 12000, totalRevenue: 10000, totalRmCost: 2000, productsSold: { A: 3 } };
  assert.deepEqual(insertGameResultSchema.parse(result), result);
  assert.equal(insertGameResultSchema.safeParse({ ...result, finalCash: "12000" }).success, false);
});
test("PostgreSQL identifier delimiters are escaped as one identifier", () => {
  const name = 'name"; DROP TABLE users; --';
  const query = new PgDialect().sqlToQuery(sql`SELECT ${sql.identifier(name)}`);
  assert.equal(query.sql, 'SELECT "name""; DROP TABLE users; --"');
  assert.deepEqual(query.params, []);
});
