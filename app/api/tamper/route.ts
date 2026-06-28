import { NextResponse } from "next/server";
import { tamperReceipt } from "@/lib/ledger";

export const dynamic = "force-dynamic";

/** POST /api/tamper — DEMO ONLY. Mutates a historical receipt's action WITHOUT
 *  recomputing its hash, so the next /api/verify flags it (and the suffix) as
 *  tampered. Body: { seq }. This proves the ledger is tamper-evident. */
export async function POST(req: Request) {
  let body: { seq?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body?.seq) return NextResponse.json({ error: "seq required" }, { status: 400 });
  try {
    return NextResponse.json(await tamperReceipt(Number(body.seq)));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
