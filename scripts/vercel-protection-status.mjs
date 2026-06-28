// Inspect project protection fields.
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

const r = await fetch(`https://api.vercel.com/v9/projects/${PRJ}?teamId=${TEAM}`, { headers: H });
const j = await r.json();
console.log("ssoProtection:", JSON.stringify(j.ssoProtection));
console.log("passwordProtection:", JSON.stringify(j.passwordProtection));
console.log("deploymentProtection:", JSON.stringify(j.deploymentProtection));
console.log("publicAccess:", JSON.stringify(j.publicAccess));
console.log("---team config---");
const t = await fetch(`https://api.vercel.com/v2/teams/${TEAM}`, { headers: H });
const tj = await t.json();
console.log("team.sso:", JSON.stringify(tj.sso));
console.log("team.allowedAtRoles:", JSON.stringify(tj.allowedAtRoles));
console.log("team keys:", Object.keys(tj).join(", "));
process.exit(0);
