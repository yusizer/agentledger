// Print the production alias / domains for the project (stable Devpost URL).
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

const d = await fetch(`https://api.vercel.com/v13/deployments/dpl_6SbpAyr3kZ?teamId=${TEAM}`, { headers: H });
const dj = await d.json();
console.log("deployment url:", dj.url);
console.log("deployment alias:", JSON.stringify(dj.alias));
console.log("deployment readyState:", dj.readyState);

const dom = await fetch(`https://api.vercel.com/v9/projects/${PRJ}/domains?teamId=${TEAM}&limit=20`, { headers: H });
const domj = await dom.json();
console.log("project domains:", JSON.stringify((domj.domains||[]).map((x)=>({name:x.name, target:x.target}))));
process.exit(0);
