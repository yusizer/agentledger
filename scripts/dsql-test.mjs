// Self-contained hash-chain proof on DSQL: append 3, verify ok, tamper one, verify broken.
import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";
import { createHash, randomUUID } from "node:crypto";
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
  host: process.env.PGHOST, region: process.env.AWS_REGION,
  user: process.env.PGUSER || "admin", database: process.env.PGDATABASE || "postgres",
  port: Number(process.env.PGPORT || 5432),
});
const sha = (s) => createHash("sha256").update(s).digest("hex");
const GEN = "0".repeat(64);
const hp = (o) => sha(JSON.stringify(o ?? null));
const rh = (f) => sha([f.prev, f.agent, f.action, f.target, f.ih, f.oh, String(f.ts)].join("|"));

async function append({ agent, action, target, input, output }) {
  const last = (await pool.query("SELECT seq, receipt_hash FROM receipts ORDER BY seq DESC LIMIT 1", [])).rows;
  const seq = Number(last[0]?.seq ?? 0) + 1;
  const prev = last[0]?.receipt_hash ?? GEN;
  const ts = Date.now();
  const ih = hp(input); const oh = hp(output);
  const h = rh({ prev, agent, action, target: target || "", ih, oh, ts });
  const id = randomUUID();
  await pool.query(
    "INSERT INTO receipts (seq,receipt_id,agent_id,action,target,input_hash,output_hash,prev_hash,receipt_hash,payload,ts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
    [seq, id, agent, action, target || "", ih, oh, prev, h, JSON.stringify({ input, output }), ts],
  );
  return { seq, h, prev };
}
async function verify() {
  const rows = (await pool.query("SELECT seq,agent_id,action,target,input_hash,output_hash,prev_hash,receipt_hash,ts FROM receipts ORDER BY seq ASC")).rows;
  let prev = GEN; let broken = null;
  const out = rows.map((r) => {
    const exp = rh({ prev, agent: r.agent_id, action: r.action, target: r.target, ih: r.input_hash, oh: r.output_hash, ts: Number(r.ts) });
    const ok = exp === r.receipt_hash && r.prev_hash === prev;
    if (!ok && broken === null) broken = Number(r.seq);
    prev = exp;
    return { seq: Number(r.seq), ok };
  });
  return { ok: broken === null, total: rows.length, broken, out };
}

console.log("Clearing table for clean test…");
await pool.query("DELETE FROM receipts", []);

console.log("Appending 3 receipts…");
for (const a of [
  { agent: "agent-alpha", action: "scan", target: "bounty:29624", input: { q: "solana" }, output: { hits: 12 } },
  { agent: "agent-beta", action: "rank", target: "bounty:29624", input: { hits: 12 }, output: { ev: 4200, heat: 7 } },
  { agent: "agent-alpha", action: "draft", target: "bounty:29624", input: { ev: 4200 }, output: { outline: ["intro", "build", "demo"] } },
]) {
  const r = await append(a);
  console.log(`  seq=${r.seq} hash=${r.h.slice(0, 12)}… prev=${r.prev.slice(0, 12)}…`);
}
const v1 = await verify();
console.log("\nVerify #1:", v1.ok ? "OK ✓" : "BROKEN", "total:", v1.total, "brokenAt:", v1.brokenAt);

if (v1.total >= 2) {
  const seqs = (await pool.query("SELECT seq FROM receipts ORDER BY seq ASC")).rows.map((r) => Number(r.seq));
  const mid = seqs[1];
  console.log(`\nTampering seq=${mid} (mutate action, no recompute)…`);
  await pool.query("UPDATE receipts SET action = action || ' ⚠ TAMPERED' WHERE seq = $1", [mid]);
  const v2 = await verify();
  console.log("Verify #2:", v2.ok ? "OK" : "BROKEN ✗", "total:", v2.total, "brokenAt:", v2.brokenAt);
  console.log("  per-receipt:", v2.out.map((r) => `${r.seq}:${r.ok ? "ok" : "X"}`).join("  "));
}
try { await pool.end(); } catch {}
process.exit(0);
