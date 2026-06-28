import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/agents — per-agent receipt counts + last activity. */
export async function GET() {
  try {
    const rows = await query<any>(
      "SELECT agent_id, COUNT(*) AS cnt, MAX(ts) AS last_ts FROM receipts GROUP BY agent_id ORDER BY cnt DESC",
      [],
    );
    return NextResponse.json(
      rows.map((r) => ({ agent_id: r.agent_id, count: Number(r.cnt), lastTs: Number(r.last_ts) })),
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
