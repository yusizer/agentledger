// Read-only: show the real receipts hash-chain rows from Amazon Aurora DSQL.
// No DELETE / UPDATE — safe to run anytime (unlike dsql-test.mjs, which clears
// the table). Use this for the demo-video AWS proof segment: a live SELECT over
// the cluster, IAM-authed, printing the hash-chain rows a judge wants to see.
//   node scripts/dsql-show.mjs
import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
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
  host: process.env.PGHOST, region: process.env.AWS_REGION,
  user: process.env.PGUSER || "admin", database: process.env.PGDATABASE || "postgres",
  port: Number(process.env.PGPORT || 5432),
});

const rows = (await pool.query(
  "SELECT seq, agent_id, action, target, prev_hash, receipt_hash, ts FROM receipts ORDER BY seq ASC LIMIT 20",
  [],
)).rows;
const total = Number((await pool.query("SELECT COUNT(*) AS n FROM receipts", [])).rows[0]?.n ?? 0);

const out = [];
out.push("Amazon Aurora DSQL — receipts table  (read-only SELECT · IAM auth · @aws/aurora-dsql-node-postgres-connector)");
out.push(`cluster: ${process.env.PGHOST}   region: ${process.env.AWS_REGION}   ${total} rows total · showing ${rows.length}`);
out.push("");
out.push("seq | agent_id      | action | target               | prev_hash[:12]   | receipt_hash[:12]");
out.push("----+---------------+--------+----------------------+------------------+------------------");
for (const r of rows) {
  const s = String(r.seq).padStart(2, "0");
  const a = String(r.agent_id).padEnd(13);
  const act = String(r.action).padEnd(6);
  const t = String(r.target).slice(0, 20).padEnd(20);
  const ph = String(r.prev_hash).slice(0, 12);
  const rh = String(r.receipt_hash).slice(0, 12);
  out.push(`${s} | ${a} | ${act} | ${t} | ${ph} | ${rh}`);
}
out.push("");
out.push("prev_hash(N) === receipt_hash(N-1)  ·  genesis prev_hash = 0^64  ·  tamper any cell → verify() flags it + every later row");
const text = out.join("\n");
console.log("\n" + text + "\n");

// also persist for the video / Devpost proof artifact
writeFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../docs/aws-proof-receipts.txt"), text);
console.log("✓ wrote docs/aws-proof-receipts.txt");
try { await pool.end(); } catch {}
process.exit(0);
