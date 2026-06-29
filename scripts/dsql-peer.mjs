// Feasibility test: create a multi-region Aurora DSQL peered cluster.
// Tries to add a peer cluster in us-west-2 linked to the existing us-east-1 cluster.
// If that's not supported for an existing single-region cluster, create a fresh pair.
import { DSQLClient, CreateClusterCommand, GetClusterCommand } from "@aws-sdk/client-dsql";
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

const PRIMARY_REGION = "us-east-1";
const PEER_REGION = "us-west-2";
const existingId = process.env.DSQL_CLUSTER_ID || "gvt4hoplihfo4v2euvr3xqp4de";

const primary = new DSQLClient({ region: PRIMARY_REGION });
const peer = new DSQLClient({ region: PEER_REGION });

async function waitActive(client, id, region, maxMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await client.send(new GetClusterCommand({ identifier: id }));
      const s = r.status;
      console.log(`  [${region}] ${id} status=${s} (linked=${r.linkedClusters?.length ?? 0})`);
      if (s === "ACTIVE") return r;
      if (s === "CREATING" || s === "PENDING") { await new Promise((x) => setTimeout(x, 8000)); continue; }
      return r;
    } catch (e) {
      console.log(`  [${region}] GetCluster ${id} error: ${e.message}`);
      await new Promise((x) => setTimeout(x, 5000));
    }
  }
  return null;
}

// 1. Confirm existing us-east-1 cluster
let primaryArn = null;
try {
  const r = await primary.send(new GetClusterCommand({ identifier: existingId }));
  primaryArn = r.arn;
  console.log(`Primary [${PRIMARY_REGION}] ${existingId}: status=${r.status} arn=${r.arn}`);
} catch (e) {
  console.error(`Primary GetCluster failed: ${e.message}`);
}

// 2. Try to create a peer cluster in us-west-2 linked to the existing primary
console.log(`\nCreating peer cluster in ${PEER_REGION} linked to primary...`);
let peerId = null;
try {
  const r = await peer.send(new CreateClusterCommand({
    linkedClusterArn: primaryArn,
    deletionProtectionEnabled: false,
  }));
  peerId = r.identifier || r.cluster?.identifier;
  console.log(`CreateCluster [${PEER_REGION}] OK: id=${peerId} arn=${r.arn || r.cluster?.arn}`);
} catch (e) {
  console.error(`CreateCluster peer (linked to existing) FAILED: ${e.name} — ${e.message}`);
  console.log("\nFalling back: create a FRESH multi-region pair (new primary us-east-1 + new peer us-west-2)...");
  try {
    const p = await primary.send(new CreateClusterCommand({ deletionProtectionEnabled: false }));
    const newPrimaryId = p.identifier || p.cluster?.identifier;
    const newPrimaryArn = p.arn || p.cluster?.arn;
    console.log(`New primary [${PRIMARY_REGION}] id=${newPrimaryId} arn=${newPrimaryArn} — waiting ACTIVE...`);
    const ready = await waitActive(primary, newPrimaryId, PRIMARY_REGION);
    if (ready?.status !== "ACTIVE") throw new Error("new primary not ACTIVE");
    const pe = await peer.send(new CreateClusterCommand({ linkedClusterArn: newPrimaryArn, deletionProtectionEnabled: false }));
    peerId = pe.identifier || pe.cluster?.identifier;
    console.log(`New peer [${PEER_REGION}] id=${peerId} arn=${pe.arn || pe.cluster?.arn}`);
    console.log(`\nFRESH PAIR: primary ${newPrimaryId} (${PRIMARY_REGION}) + peer ${peerId} (${PEER_REGION})`);
    console.log(`  export DSQL_PRIMARY_ID=${newPrimaryId}`);
    console.log(`  export DSQL_PEER_ID=${peerId}`);
  } catch (e2) {
    console.error(`Fresh pair also FAILED: ${e2.message}`);
    process.exit(1);
  }
}

// 3. Wait peer ACTIVE
if (peerId) {
  console.log(`\nWaiting peer ${peerId} ACTIVE in ${PEER_REGION}...`);
  const ready = await waitActive(peer, peerId, PEER_REGION, 240000);
  console.log(`Peer final: ${ready?.status}`);
  if (ready?.status === "ACTIVE") {
    console.log(`\n✓ MULTI-REGION FEASIBLE. peerId=${peerId} region=${PEER_REGION}`);
    console.log(`  peer endpoint: ${peerId}.dsql.${PEER_REGION}.on.aws`);
  }
}
process.exit(0);
