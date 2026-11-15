// Run only against a disposable CI database or a private restored compatibility copy.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as schema from "../shared/schema";

const url = new URL(process.env.DATABASE_URL || "http://missing");
assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
assert.ok(url.pathname === "/gsim_ci" || /^\/gsim_compat_[a-z0-9_]{1,40}$/.test(url.pathname));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const db = drizzle(pool, { schema });
const rollback = new Error("intentional compatibility rollback");
const username = "compat-" + randomUUID();
let tables = 0;
try {
  for (const value of Object.values(schema)) {
    if (is(value, PgTable)) {
      assert.deepEqual(await db.select().from(value).limit(0), []);
      tables++;
    }
  }
  assert.equal(tables, 16);
  assert.deepEqual(await db.query.trainers.findMany({ columns: { id: true }, with: { sessions: true }, limit: 0 }), []);
  await assert.rejects(db.transaction(async tx => {
    const [user] = await tx.insert(schema.users).values({ username, password: "synthetic-unused-hash" }).returning();
    assert.equal(user.username, username);
    const [result] = await tx.insert(schema.gameResults).values({ playerName: username, finalCash: 12000, totalRevenue: 10000, totalRmCost: 2000, productsSold: { A: 3 } }).returning();
    assert.deepEqual(result.productsSold, { A: 3 });
    await tx.update(schema.gameResults).set({ finalCash: 13000 }).where(eq(schema.gameResults.id, result.id));
    const [read] = await tx.select().from(schema.gameResults).where(eq(schema.gameResults.id, result.id));
    assert.equal(read.finalCash, 13000);
    throw rollback;
  }), error => error === rollback);
  assert.deepEqual(await db.select().from(schema.users).where(eq(schema.users.username, username)), []);
  assert.deepEqual(await db.select().from(schema.gameResults).where(eq(schema.gameResults.playerName, username)), []);
  console.log(JSON.stringify({ all16TablesCompatible: true, relationsCompatible: true, insertUpdateSelectRollback: true }));
} finally { await pool.end(); }
