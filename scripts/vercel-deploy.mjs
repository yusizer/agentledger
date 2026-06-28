// Deploy BountyStack to Vercel via the Vercel REST API — no CLI, no secrets in
// the command line. Token + AWS creds come from .env.local (auto-loaded).
//   node scripts/vercel-deploy.mjs
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

try {
  const _p = resolve(dirname(fileURLToPath(import.meta.url)), "../.env.local");
  if (existsSync(_p))
    for (const _l of readFileSync(_p, "utf8").split("\n")) {
      const _m = _l.match(/^([A-Z0-9_]+)=(.*)$/);
      if (_m && !process.env[_m[1]]) process.env[_m[1]] = _m[2];
    }
} catch {}

const TOKEN = process.env.VERCEL_TOKEN;
if (!TOKEN) {
  console.error("VERCEL_TOKEN missing in .env.local");
  process.exit(1);
}
const H = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
const GITHUB_REPO = "yusizer/bountystack";
const PROJECT = "bountystack";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Team
const teamsRes = await fetch("https://api.vercel.com/v2/teams", { headers: H });
const teamsJson = await teamsRes.json();
const team = teamsJson.teams?.[0];
if (!team) {
  console.error("No teams found:", JSON.stringify(teamsJson));
  process.exit(1);
}
console.log(`Team: ${team.slug}  (id: ${team.id})`);

// 2. Create / get project (link to GitHub repo if possible)
async function getProject() {
  const r = await fetch(`https://api.vercel.com/v9/projects/${PROJECT}?teamId=${team.id}`, { headers: H });
  if (r.ok) return await r.json();
  return null;
}
let proj = await getProject();
if (proj) {
  console.log(`Project exists: ${proj.id}  git: ${proj.link?.repo || "none"}`);
} else {
  // try with git repo first
  let r = await fetch(`https://api.vercel.com/v10/projects?teamId=${team.id}`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ name: PROJECT, gitRepository: { type: "github", repo: GITHUB_REPO } }),
  });
  let j = await r.json();
  if (!r.ok && /exists|already/i.test(j.error?.message || "")) {
    proj = await getProject();
  } else if (!r.ok) {
    console.log(`git link failed (${j.error?.message}) → creating plain project`);
    r = await fetch(`https://api.vercel.com/v10/projects?teamId=${team.id}`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({ name: PROJECT }),
    });
    j = await r.json();
    if (!r.ok) {
      console.error("project create failed:", JSON.stringify(j));
      process.exit(1);
    }
    proj = j;
  } else {
    proj = j;
  }
  console.log(`Project created: ${proj.id}  git: ${proj.link?.repo || "none"}`);
}

// 3. Env vars (idempotent-ish: list existing, skip if present)
const envs = [
  ["AWS_REGION", process.env.AWS_REGION || "us-east-1", "encrypted"],
  ["AWS_ACCESS_KEY_ID", process.env.AWS_ACCESS_KEY_ID, "encrypted"],
  ["AWS_SECRET_ACCESS_KEY", process.env.AWS_SECRET_ACCESS_KEY, "encrypted"],
  ["BOUNTIES_TABLE", process.env.BOUNTIES_TABLE || "BountystackBounties", "encrypted"],
  ["SAVES_TABLE", process.env.SAVES_TABLE || "BountystackSaves", "encrypted"],
  ["NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL || "https://bountystack.vercel.app", "plain"],
];
const existingEnvRes = await fetch(`https://api.vercel.com/v9/projects/${PROJECT}/env?teamId=${team.id}`, { headers: H });
const existingEnv = (await existingEnvRes.json()).envs || [];
for (const [key, value, type] of envs) {
  if (!value) {
    console.log(`env ${key}: SKIPPED (no value)`);
    continue;
  }
  if (existingEnv.some((e) => e.key === key)) {
    console.log(`env ${key}: already set`);
    continue;
  }
  const r = await fetch(`https://api.vercel.com/v9/projects/${PROJECT}/env?teamId=${team.id}`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ key, value, type, target: ["production", "preview"] }),
  });
  const j = await r.json();
  console.log(`env ${key}: ${r.ok ? "ok" : j.error?.message}`);
}

// 4. Deploy
if (proj.link?.repo) {
  console.log("Triggering production deploy from GitHub master…");
  const r = await fetch(`https://api.vercel.com/v13/deployments?teamId=${team.id}&skipAutoDetectionConfirmation=1`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      name: PROJECT,
      gitSource: { type: "github", repoId: 1283095734, repo: GITHUB_REPO, ref: "master" },
      target: "production",
    }),
  });
  const j = await r.json();
  if (!r.ok) {
    console.error("deploy trigger failed:", JSON.stringify(j));
    process.exit(1);
  }
  console.log(`Deployment ${j.id}  ${j.url}  (${j.readyState})`);
  let final = j;
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const s = await fetch(`https://api.vercel.com/v13/deployments/${j.id}?teamId=${team.id}`, { headers: H });
    const k = await s.json();
    console.log(`  ${k.readyState}  ${k.url}`);
    final = k;
    if (k.readyState === "READY" || k.readyState === "ERROR") break;
  }
  console.log(`\nLIVE: https://${final.url}`);
} else {
  console.log("\nNo GitHub link on the project — git auto-deploy not available.");
  console.log("Install the Vercel GitHub app (Vercel → Projects → Add → Import → authorize GitHub), then re-run this script, OR I'll upload via the Vercel CLI.");
}
console.log(`\nTeam ID: ${team.id}`);
process.exit(0);
