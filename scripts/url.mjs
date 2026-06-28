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
const r = await fetch(`https://api.vercel.com/v9/projects/agentledger/domains?teamId=${TEAM}&limit=20`, { headers: H });
const j = await r.json();
console.log("domains:", JSON.stringify((j.domains || []).map((x) => ({ name: x.name, target: x.target }))));
process.exit(0);
