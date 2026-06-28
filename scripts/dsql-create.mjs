// Create an Aurora DSQL cluster (free tier) for AgentLedger. Polls to ACTIVE.
//   node scripts/dsql-create.mjs
import DsqlPkg from "@aws-sdk/client-dsql";
const { DSQLClient, CreateClusterCommand, GetClusterCommand, ListClustersCommand } = DsqlPkg;
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
const region = process.env.AWS_REGION || "us-east-1";
const client = new DSQLClient({ region });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// reuse existing ACTIVE cluster
let id = null;
try {
  const list = await client.send(new ListClustersCommand({}));
  const avail = (list.clusters || []).find((c) => c.status === "ACTIVE");
  if (avail) {
    id = avail.identifier;
    console.log("Reusing existing ACTIVE cluster:", id);
  } else {
    console.log("Existing clusters:", (list.clusters || []).map((c) => `${c.identifier}:${c.status}`).join(", ") || "none");
  }
} catch (e) {
  console.log("list clusters:", e.message);
}

if (!id) {
  try {
    const r = await client.send(new CreateClusterCommand({}));
    id = r.identifier || r.cluster?.identifier;
    console.log("Creating new cluster:", id, "status:", r.status || r.cluster?.status);
  } catch (e) {
    console.error("CreateCluster failed:", e.name, e.message);
    process.exit(1);
  }
}

for (let i = 0; i < 120; i++) {
  let d;
  try {
    d = await client.send(new GetClusterCommand({ identifier: id }));
  } catch (e) {
    console.log(`[${i}] get error: ${e.message}`);
    await sleep(5000);
    continue;
  }
  const st = d.status || d.cluster?.status;
  const ep = d.endpoint || d.cluster?.endpoint || "";
  console.log(`[${i}] ${st}  ${ep}`);
  if (st === "ACTIVE") {
    console.log("\nDSQL_ENDPOINT=" + ep);
    console.log("DSQL_IDENTIFIER=" + id);
    console.log("DSQL_REGION=" + region);
    console.log("DSQL_ARN=" + (d.arn || d.cluster?.arn || ""));
    break;
  }
  await sleep(5000);
}
process.exit(0);
