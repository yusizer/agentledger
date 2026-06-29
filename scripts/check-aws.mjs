// Check AWS resources for #1 AI bounty intelligence agent:
//  - Bedrock embedding model access (Titan/Nova) — for pgvector embeddings
//  - DSQL multi-region cluster (reuse AgentLedger attestation)
//  - Aurora PG clusters (need to create one for pgvector)
import { BedrockClient, ListFoundationModelsCommand } from "@aws-sdk/client-bedrock";
import { DSQLClient, ListClustersCommand, GetClusterCommand } from "@aws-sdk/client-dsql";
import { RDSClient, DescribeDBClustersCommand } from "@aws-sdk/client-rds";
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

// 1. Bedrock embedding models
console.log("=== Bedrock embedding models ===");
try {
  const b = new BedrockClient({ region });
  const r = await b.send(new ListFoundationModelsCommand({ byInferenceModality: "TEXT", byOutputModality: "EMBEDDING" }));
  const embs = (r.modelSummaries || []).filter((m) => /embed|titan|nova/i.test(m.modelId));
  console.log("embedding models:", embs.map((m) => `${m.modelId} (${m.modelName})`));
  if (!embs.length) {
    const all = await b.send(new ListFoundationModelsCommand({}));
    console.log("ALL models (filter embed):", (all.modelSummaries || []).filter((m) => /embed/i.test(m.modelId)).map((m) => m.modelId));
  }
} catch (e) { console.error("Bedrock err:", e.name, e.message?.slice(0, 200)); }

// 2. DSQL clusters
console.log("\n=== DSQL clusters (us-east-1) ===");
try {
  const d = new DSQLClient({ region });
  const r = await d.send(new ListClustersCommand({}));
  for (const cl of r.clusters || []) {
    console.log(`  ${cl.identifier} status=${cl.status} linked=${cl.linkedClusters?.length || 0} arn=${cl.arn}`);
  }
} catch (e) { console.error("DSQL err:", e.message); }

// 3. Aurora PG clusters
console.log("\n=== Aurora PG clusters (us-east-1) ===");
try {
  const rds = new RDSClient({ region });
  const r = await rds.send(new DescribeDBClustersCommand({}));
  const aurora = (r.dbClusters || []).filter((x) => /aurora-postgres|postgres/i.test(x.engine || ""));
  if (!aurora.length) console.log("  none — need to CREATE Aurora PG cluster for pgvector");
  for (const c of aurora) console.log(`  ${c.dbClusterIdentifier} engine=${c.engine} status=${c.status}`);
} catch (e) { console.error("RDS err:", e.message); }
process.exit(0);
