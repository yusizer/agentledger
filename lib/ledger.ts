import { randomUUID } from "node:crypto";
import { query, withOCCRetry, withConnection } from "./db";
import { receiptHash, hashPayload, GENESIS_HASH } from "./crypto";
import type { Receipt, VerifyResult } from "./types";

export interface AppendInput {
  agentId: string;
  action: string;
  target?: string;
  input?: unknown;
  output?: unknown;
}

/**
 * Append a receipt to the chain. Reads the current tail, computes the next
 * hash, and inserts. On a concurrent append (unique prev_hash / seq PK
 * conflict — surfaced by DSQL as an OCC conflict) the whole read-compute-insert
 * is retried against the new tail, so the chain stays linear under contention.
 */
export async function appendReceipt(inp: AppendInput): Promise<Receipt> {
  return withOCCRetry(async () => {
    const last = await query<{ seq: number; receipt_hash: string }>(
      "SELECT seq, receipt_hash FROM receipts ORDER BY seq DESC LIMIT 1",
      [],
    );
    const seq = Number(last[0]?.seq ?? 0) + 1;
    const prevHash = last[0]?.receipt_hash ?? GENESIS_HASH;
    const ts = Date.now();
    const inputHash = hashPayload(inp.input);
    const outputHash = hashPayload(inp.output);
    const rh = receiptHash({
      prevHash,
      agentId: inp.agentId,
      action: inp.action,
      target: inp.target || "",
      inputHash,
      outputHash,
      ts,
    });
    const receiptId = randomUUID();
    const payload = JSON.stringify({ input: inp.input ?? null, output: inp.output ?? null });
    await query(
      `INSERT INTO receipts
         (seq, receipt_id, agent_id, action, target, input_hash, output_hash, prev_hash, receipt_hash, payload, ts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [seq, receiptId, inp.agentId, inp.action, inp.target || "", inputHash, outputHash, prevHash, rh, payload, ts],
    );
    return {
      seq,
      receipt_id: receiptId,
      agent_id: inp.agentId,
      action: inp.action,
      target: inp.target || "",
      input_hash: inputHash,
      output_hash: outputHash,
      prev_hash: prevHash,
      receipt_hash: rh,
      payload: { input: inp.input ?? null, output: inp.output ?? null },
      ts,
    } as Receipt;
  });
}

/** List the whole chain in order. */
export async function listReceipts(): Promise<Receipt[]> {
  const rows = await query<any>(
    "SELECT seq, receipt_id, agent_id, action, target, input_hash, output_hash, prev_hash, receipt_hash, payload, ts FROM receipts ORDER BY seq ASC",
    [],
  );
  return rows.map((r) => ({
    ...r,
    payload: r.payload ? (typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload) : null,
    ts: Number(r.ts),
  })) as Receipt[];
}

/**
 * Recompute the chain and find the first tampered receipt. Uses the recomputed
 * (not stored) previous hash as the link, so a mutation at seq N breaks every
 * receipt from N forward — proving both *where* and *that* tamper happened.
 */
export async function verifyChain(): Promise<VerifyResult> {
  const rows = await query<any>(
    "SELECT seq, agent_id, action, target, input_hash, output_hash, prev_hash, receipt_hash, ts FROM receipts ORDER BY seq ASC",
    [],
  );
  let prevHash = GENESIS_HASH;
  let brokenAt: number | null = null;
  const receipts = rows.map((r) => {
    const expected = receiptHash({
      prevHash,
      agentId: r.agent_id,
      action: r.action,
      target: r.target,
      inputHash: r.input_hash,
      outputHash: r.output_hash,
      ts: Number(r.ts),
    });
    const hashOk = expected === r.receipt_hash;
    const linkOk = r.prev_hash === prevHash;
    const ok = hashOk && linkOk;
    if (!ok && brokenAt === null) brokenAt = Number(r.seq);
    prevHash = expected; // recomputed link → break propagates
    return {
      seq: Number(r.seq),
      agent_id: r.agent_id,
      action: r.action,
      target: r.target,
      ts: Number(r.ts),
      receipt_hash: r.receipt_hash,
      expected_hash: expected,
      ok,
    };
  });
  return { ok: brokenAt === null, total: rows.length, brokenAt, receipts };
}

/**
 * Demo: mutate a historical receipt's action WITHOUT recomputing its hash.
 * The next verifyChain() will flag it (and everything after it) as tampered.
 */
export async function tamperReceipt(seq: number): Promise<{ updated: number }> {
  const r: any = await withConnection(async (client) =>
    client.query("UPDATE receipts SET action = action || ' ⚠ TAMPERED' WHERE seq = $1", [seq]),
  );
  return { updated: r?.rowCount ?? 0 };
}
