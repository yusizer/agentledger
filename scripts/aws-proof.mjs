// Generate AWS-usage proof SVGs from REAL AWS API data:
//  - CloudWatch metrics for the Aurora DSQL cluster (ListMetrics + GetMetricStatistics)
//  - DSQL control-plane cluster metadata (GetCluster)
//  - DSQL data-plane: the actual `receipts` hash-chain rows
// Output: docs/aws-proof.svg (CloudWatch + cluster) + docs/aws-proof-receipts.svg (rows).
import { CloudWatchClient, ListMetricsCommand, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { DSQLClient, GetClusterCommand } from "@aws-sdk/client-dsql";
import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// auto-load .env.local
try {
  const _p = resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local");
  if (existsSync(_p)) for (const _l of readFileSync(_p, "utf8").split("\n")) {
    const _m = _l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (_m && !process.env[_m[1]]) process.env[_m[1]] = _m[2];
  }
} catch {}

const region = process.env.AWS_REGION || "us-east-1";
const pghost = process.env.PGHOST;
if (!pghost) { console.error("PGHOST missing in .env.local"); process.exit(1); }
const clusterId = pghost.split(".")[0];
const dir = dirname(fileURLToPath(import.meta.url));

const cw = new CloudWatchClient({ region });
const dsql = new DSQLClient({ region });

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---- 1. cluster metadata (control plane) ----
let cluster = null;
try {
  cluster = await dsql.send(new GetClusterCommand({ identifier: clusterId }));
  console.log("GetCluster OK:", cluster.status, cluster.arn);
} catch (e) {
  console.error("GetCluster failed:", e.message);
}

// ---- 2. CloudWatch: list metrics, then stats for the key ones ----
let metricsList = [];
try {
  const r = await cw.send(new ListMetricsCommand({ Namespace: "AWS/AuroraDSQL" }));
  metricsList = (r.Metrics || []).filter((m) =>
    (m.Dimensions || []).some((d) => d.Name === "ClusterId" && d.Value === clusterId),
  );
  console.log("ListMetrics:", metricsList.length, "metrics for cluster", clusterId);
} catch (e) {
  console.error("ListMetrics failed:", e.message);
}

const wantMetrics = ["CommitRequests", "QueryCount", "TransactionCount", "ActiveTransactions", "AbortedTransactions", "CPUUtilization"];
const dimByName = {};
for (const m of metricsList) dimByName[m.MetricName] = m.Dimensions || [];
console.log("metrics under AWS/AuroraDSQL:");
for (const m of metricsList) {
  console.log("  ", m.MetricName, (m.Dimensions || []).map((d) => `${d.Name}=${d.Value}`).join(","));
}

const end = new Date();
const start = new Date(end.getTime() - 24 * 3600 * 1000); // last 24h
const series = {};
// Pull stats for every metric the cluster actually exposes (dims straight from ListMetrics).
for (const m of metricsList) {
  try {
    const r = await cw.send(new GetMetricStatisticsCommand({
      Namespace: "AWS/AuroraDSQL", MetricName: m.MetricName, Dimensions: m.Dimensions || [],
      StartTime: start, EndTime: end, Period: 300, Statistics: ["Sum", "SampleCount", "Average"],
    }));
    if (r.Datapoints && r.Datapoints.length) {
      series[m.MetricName] = r.Datapoints.sort((a, b) => (a.Timestamp < b.Timestamp ? -1 : 1));
      console.log(`  stats ${m.MetricName}: ${r.Datapoints.length} datapoints`);
    }
  } catch (e) {
    console.error(`  stats ${m.MetricName} failed:`, e.message);
  }
}

// ---- 3. data plane: real receipts rows ----
const pool = new AuroraDSQLPool({
  host: pghost, region, user: process.env.PGUSER || "admin",
  database: process.env.PGDATABASE || "postgres", port: Number(process.env.PGPORT || 5432),
});
let rows = [];
let total = 0;
try {
  rows = (await pool.query(
    "SELECT seq, receipt_id, agent_id, action, target, prev_hash, receipt_hash, ts FROM receipts ORDER BY seq ASC LIMIT 14",
    [],
  )).rows;
  total = Number((await pool.query("SELECT COUNT(*) AS n FROM receipts", [])).rows[0]?.n ?? 0);
  console.log("receipts: total", total, "showing", rows.length);
} catch (e) {
  console.error("data-plane query failed:", e.message);
}
try { await pool.end(); } catch {}

// ---- 4. SVG: CloudWatch metrics + cluster card ----
const W = 880;
const metricNames = Object.keys(series);
const chartTop = 150;
const chartH = 90;
const chartLeft = 60;
const chartW = W - 90;

function metricPath(pts, yMax) {
  if (!pts.length) return "";
  const xs = pts.map((p) => p.Timestamp.getTime());
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const span = xMax - xMin || 1;
  return pts.map((p, i) => {
    const x = chartLeft + ((p.Timestamp.getTime() - xMin) / span) * chartW;
    const v = Number(p.Sum ?? 0) || Number(p.Average ?? 0);
    const y = chartTop + chartH - (v / (yMax || 1)) * chartH;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

const colors = ["#34d399", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa", "#22d3ee"];
const chartsSvg = metricNames.map((name, idx) => {
  const pts = series[name];
  const yMax = Math.max(1, ...pts.map((p) => Number(p.Sum ?? 0) || Number(p.Average ?? 0)));
  const top = chartTop + idx * (chartH + 46);
  const path = metricPath(pts, yMax);
  const totalSum = pts.reduce((a, p) => a + (Number(p.Sum ?? 0) || Number(p.Average ?? 0)), 0);
  const c = colors[idx % colors.length];
  return `
  <text x="${chartLeft}" y="${top - 14}" fill="${c}" font-size="13" font-family="ui-monospace,monospace">${esc(name)}</text>
  <text x="${W - 45}" y="${top - 14}" fill="#94a3b8" font-size="11" text-anchor="end">Σ ${totalSum}  ·  ${pts.length} pts</text>
  <rect x="${chartLeft}" y="${top}" width="${chartW}" height="${chartH}" rx="6" fill="#0f172a" stroke="#1e293b"/>
  <line x1="${chartLeft}" y1="${top + chartH}" x2="${chartLeft + chartW}" y2="${top + chartH}" stroke="#1e293b"/>
  <line x1="${chartLeft}" y1="${top}" x2="${chartLeft}" y2="${top + chartH}" stroke="#1e293b"/>
  <text x="${chartLeft - 6}" y="${top + 10}" fill="#475569" font-size="9" text-anchor="end">${yMax}</text>
  <text x="${chartLeft - 6}" y="${top + chartH}" fill="#475569" font-size="9" text-anchor="end">0</text>
  ${path ? `<path d="${path}" fill="none" stroke="${c}" stroke-width="1.8"/>` : `<text x="${chartLeft + 10}" y="${top + chartH / 2}" fill="#475569" font-size="11">no recent datapoints</text>`}
  <text x="${chartLeft}" y="${top + chartH + 16}" fill="#475569" font-size="9">${new Date(Math.min(...pts.map(p=>p.Timestamp.getTime()))).toLocaleString()} → ${new Date(Math.max(...pts.map(p=>p.Timestamp.getTime()))).toLocaleString()}</text>`;
}).join("");

const clusterRows = [
  ["cluster identifier", clusterId],
  ["endpoint", pghost],
  ["region", region],
  ["status", cluster?.status ?? "—"],
  ["arn", cluster?.arn ?? "—"],
  ["writable", cluster?.writable ?? "—"],
  ["deletion protection", cluster?.deletionProtectionEnabled ?? "—"],
].map(([k, v]) => `
  <tr><td fill="#64748b" font-size="11">${esc(k)}</td><td fill="#e2e8f0" font-size="11" font-family="ui-monospace,monospace">${esc(v)}</td></tr>`).join("");

const svgH = 120 + metricNames.length * (chartH + 46) + 30;
const cloudwatchSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${svgH}" viewBox="0 0 ${W} ${svgH}">
  <rect width="100%" height="100%" fill="#0b1120"/>
  <text x="30" y="38" fill="#f1f5f9" font-size="20" font-weight="700">Amazon Aurora DSQL — AWS usage proof</text>
  <text x="30" y="60" fill="#64748b" font-size="12">AgentLedger · H0: Hack the Zero Stack · generated ${new Date().toISOString()} from live AWS API calls</text>
  <rect x="30" y="78" width="${W - 60}" height="${Math.max(60, 22 * 7 + 10)}" rx="8" fill="#0f172a" stroke="#1e293b"/>
  <text x="42" y="98" fill="#94a3b8" font-size="11">CLUSTER (control plane · GetCluster)</text>
  <g transform="translate(54,116)">
    <table>${clusterRows}</table>
  </g>
  <text x="30" y="${chartTop - 30}" fill="#94a3b8" font-size="11">CloudWatch metrics · AWS/AuroraDSQL · last 6h (GetMetricStatistics, 5-min period)</text>
  ${chartsSvg || `<text x="${chartLeft}" y="${chartTop + 20}" fill="#475569" font-size="12">No CloudWatch datapoints returned (cluster idle / free tier) — cluster + rows below still prove usage.</text>`}
</svg>`;

// ---- 5. SVG: real receipts rows (the hash chain) ----
const rW = 920;
const cols = ["seq", "agent_id", "action", "target", "prev_hash[:12]", "receipt_hash[:12]"];
const colX = [20, 80, 220, 320, 480, 640];
const colW = [60, 140, 100, 160, 160, 160];
const rowH = 22;
const headH = 70;
const tableH = headH + 30 + rows.length * rowH + 20;
const receiptsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rW}" height="${tableH}" viewBox="0 0 ${rW} ${tableH}">
  <rect width="100%" height="100%" fill="#0b1120"/>
  <text x="20" y="34" fill="#f1f5f9" font-size="18" font-weight="700">Aurora DSQL · receipts table — real hash-chain rows</text>
  <text x="20" y="54" fill="#64748b" font-size="11">SELECT … FROM receipts ORDER BY seq ASC · ${total} rows total · generated ${new Date().toISOString()}</text>
  <rect x="14" y="${headH - 6}" width="${rW - 28}" height="${30 + rows.length * rowH}" rx="6" fill="#0f172a" stroke="#1e293b"/>
  ${cols.map((c, i) => `<text x="${colX[i]}" y="${headH + 14}" fill="#64748b" font-size="11">${esc(c)}</text>`).join("")}
  <line x1="16" y1="${headH + 22}" x2="${rW - 16}" y2="${headH + 22}" stroke="#1e293b"/>
  ${rows.map((r, ri) => {
    const y = headH + 40 + ri * rowH;
    const cells = [
      String(r.seq),
      String(r.agent_id),
      String(r.action),
      String(r.target),
      String(r.prev_hash).slice(0, 12) + "…",
      String(r.receipt_hash).slice(0, 12) + "…",
    ];
    return cells.map((v, ci) => `<text x="${colX[ci]}" y="${y}" fill="${ci === 0 ? "#34d399" : ci >= 4 ? "#60a5fa" : "#cbd5e1"}" font-size="11" font-family="${ci >= 4 || ci === 0 ? "ui-monospace,monospace" : "ui-sans-serif,system-ui"}">${esc(v)}</text>`).join("") + `<line x1="16" y1="${y + 6}" x2="${rW - 16}" y2="${y + 6}" stroke="#111827"/>`;
  }).join("")}
  <text x="20" y="${tableH - 6}" fill="#475569" font-size="10">prev_hash of row N === receipt_hash of row N-1 · genesis prev_hash = 0^64 · tamper any cell → verify() flags it and every later row</text>
</svg>`;

writeFileSync(resolve(dir, "../docs/aws-proof.svg"), cloudwatchSvg);
writeFileSync(resolve(dir, "../docs/aws-proof-receipts.svg"), receiptsSvg);
console.log("\n✓ wrote docs/aws-proof.svg + docs/aws-proof-receipts.svg");
process.exit(0);
