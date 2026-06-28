export interface Receipt {
  seq: number;
  receipt_id: string;
  agent_id: string;
  action: string;
  target: string;
  input_hash: string;
  output_hash: string;
  prev_hash: string;
  receipt_hash: string;
  payload: unknown;
  ts: number;
}

export interface VerifyReceipt {
  seq: number;
  agent_id: string;
  action: string;
  target: string;
  ts: number;
  receipt_hash: string;
  expected_hash: string;
  ok: boolean;
}

export interface VerifyResult {
  ok: boolean;
  total: number;
  brokenAt: number | null;
  receipts: VerifyReceipt[];
}
