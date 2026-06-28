import { NextResponse } from "next/server";
import { appendReceipt } from "@/lib/ledger";

export const dynamic = "force-dynamic";

/** POST /api/receipt — append an agent action to the tamper-evident chain.
 *  Body: { agentId, action, target?, input?, output? }
 *  DSQL OCC: if a concurrent append took the same chain tail, the unique
 *  prev_hash / seq PK conflict surfaces as a retryable OCC error and the
 *  whole read-compute-insert is retried against the new tail. */
export async function POST(req: Request) {
  let body: { agentId?: string; action?: string; target?: string; input?: unknown; output?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body?.agentId || !body?.action) {
    return NextResponse.json({ error: "agentId and action required" }, { status: 400 });
  }
  try {
    const r = await appendReceipt({
      agentId: body.agentId,
      action: body.action,
      target: body.target,
      input: body.input,
      output: body.output,
    });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
