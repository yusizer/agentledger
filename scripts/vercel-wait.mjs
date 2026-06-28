// Poll the latest production deployment until READY/ERROR, print the live URL.
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
const PRJ = "prj_3e8C81SDjKQKgtmKfPJdz1sTHPAR";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let last = null;
for (let i = 0; i < 40; i++) {
  const r = await fetch(`https://api.vercel.com/v6/deployments?teamId=${TEAM}&projectId=${PRJ}&limit=1&target=production`, { headers: H });
  const j = await r.json();
  const d = j.deployments?.[0];
  if (d) {
    last = d;
    console.log(`[${i}] ${d.uid.slice(0,14)}  ${d.readyState}  ${d.url}  alias: ${(d.alias||[]).join(", ")||"-"}  (${d.meta?.commitMessage?.slice(0,40) || ""})`);
    if (d.readyState === "READY" || d.readyState === "ERROR" || d.readyState === "CANCELED") break;
  } else {
    console.log(`[${i}] no deployment yet`);
  }
  await sleep(8000);
}
if (last) {
  console.log(`\nFINAL: ${last.readyState}`);
  console.log(`LIVE URL: https://${last.url}`);
} else {
  console.log("No production deployment found.");
}
process.exit(0);
