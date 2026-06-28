// Fetch Vercel build logs / error for a deployment id (arg 1) or latest production.
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
const TOKEN = process.env.VERCEL_TOKEN;
const H = { Authorization: `Bearer ${TOKEN}` };
const TEAM = "team_Znk3yYItc5FxiJBF2rbqKVON";
const PROJECT = "bountystack";

let depId = process.argv[2];
if (!depId) {
  const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=&app=${PROJECT}&teamId=${TEAM}&limit=1&target=production`, { headers: H });
  const j = await r.json();
  depId = j.deployments?.[0]?.uid;
}
console.log("Deployment:", depId);

const d = await fetch(`https://api.vercel.com/v13/deployments/${depId}?teamId=${TEAM}`, { headers: H });
const dj = await d.json();
console.log("status:", dj.readyState, "error:", dj.error?.message || dj.errorMsg || "(none)");

const ev = await fetch(`https://api.vercel.com/v3/deployments/${depId}/events?teamId=${TEAM}&limit=200`, { headers: H });
const evj = await ev.json();
const lines = Array.isArray(evj) ? evj : evj.events || [];
const interesting = lines.filter((e) =>
  /error|fail|cannot|not found|ENOENT|module|TypeError|SyntaxError|exit code/i.test(e.payload?.text || e.text || "") || e.type === "error"
);
for (const e of interesting.slice(-40)) {
  const t = e.payload?.text || e.text || e.message || JSON.stringify(e.payload || e);
  console.log((e.created || "") + " | " + t.slice(0, 500));
}
// also dump last 25 raw lines for context
console.log("\n--- last 25 events ---");
for (const e of lines.slice(-25)) {
  const t = e.payload?.text || e.text || e.message || JSON.stringify(e.payload || e).slice(0,200);
  console.log((e.type||"") + " | " + String(t).slice(0, 300));
}
process.exit(0);
