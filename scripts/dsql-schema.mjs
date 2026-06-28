// Create the AgentLedger schema in Aurora DSQL (Postgres-compatible).
//   node scripts/dsql-schema.mjs
import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
try {
  const _p = resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local");
  if (existsSync(_p)) for (const _l of readFileSync(_p, "utf8").split("\n")) {
    const _m = _l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (_m && !process.env[_m[1]]) process.env[_m[1]] = _m[2];
  }
} catch {}

const pool = new AuroraDSQLPool({
  host: process.env.PGHOST,
  region: process.env.AWS_REGION,
  user: process.env.PGUSER || "admin",
  database: process.env.PGDATABASE || "postgres",
  port: Number(process.env.PGPORT || 5432),
});

const client = await pool.connect();
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS receipts (
      seq          BIGINT PRIMARY KEY,
      receipt_id   TEXT NOT NULL UNIQUE,
      agent_id     TEXT NOT NULL,
      action       TEXT NOT NULL,
      target       TEXT NOT NULL DEFAULT '',
      input_hash   TEXT NOT NULL,
      output_hash  TEXT NOT NULL,
      prev_hash    TEXT NOT NULL UNIQUE,
      receipt_hash TEXT NOT NULL UNIQUE,
      payload      TEXT,
      ts           BIGINT NOT NULL
    )
  `);
  console.log("schema ok — table receipts ready (UNIQUE constraints index prev_hash/receipt_hash/receipt_id; PK indexes seq)");
} catch (e) {
  console.error("schema failed:", e.message);
  process.exit(1);
} finally {
  client.release();
  try { await pool.end(); } catch {}
}
process.exit(0);
