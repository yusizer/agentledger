import { createHash } from "node:crypto";

/** SHA-256 hex digest. */
export function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** Genesis previous-hash for the first receipt in the chain. */
export const GENESIS_HASH = "0".repeat(64);

export interface ReceiptFields {
  prevHash: string;
  agentId: string;
  action: string;
  target: string;
  inputHash: string;
  outputHash: string;
  ts: number;
}

/**
 * Tamper-evident receipt hash. Each receipt commits to the previous receipt's
 * hash, so mutating any field of any historical receipt breaks the chain from
 * that point forward. Fields are joined with a delimiter that cannot appear in
 * the hashed values to prevent ambiguity.
 */
export function receiptHash(f: ReceiptFields): string {
  return sha256Hex(
    [f.prevHash, f.agentId, f.action, f.target, f.inputHash, f.outputHash, String(f.ts)].join("|"),
  );
}

/** Hash a JSON-serialisable payload (the agent's input/output document). */
export function hashPayload(obj: unknown): string {
  return sha256Hex(JSON.stringify(obj ?? null));
}

/** Short fingerprint for display (first 10 chars). */
export function short(h: string): string {
  return h.slice(0, 10);
}
