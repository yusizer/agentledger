import { NextResponse } from "next/server";
import { appendReceipt } from "@/lib/ledger";
import { query } from "@/lib/db";
import bounties from "@/data/bounties.json";

export const dynamic = "force-dynamic";

/** POST /api/seed — reset and seed a realistic chain: 3 AI-agent personas
 *  (scanner / valuator / submitter) act over the first N REAL scraped bounty
 *  listings (data/bounties.json), each action attested as a receipt. This is
 *  the demo dataset — the "by a hunter, for hunters" edge rendered as an
 *  agent-trust ledger. */
export async function POST() {
  try {
    await query("DELETE FROM receipts", []);
    let n = 0;
    const targets = (bounties as any[]).slice(0, 10);
    for (const b of targets) {
      const target = `bounty:${String(b.id).slice(0, 12)}`;
      const ev = Math.max(1, Math.round((b.prizeUsd || 500) / 10));
      await appendReceipt({
        agentId: "agent-alpha",
        action: "scan",
        target,
        input: { platform: b.platform, type: b.type, deadline: b.deadline },
        output: { found: true, prizeUsd: b.prizeUsd || 0 },
      }); n++;
      await appendReceipt({
        agentId: "agent-beta",
        action: "rank",
        target,
        input: { deadline: b.deadline, prizeUsd: b.prizeUsd || 0 },
        output: { ev, heat: (n % 5) + 1, verdict: ev > 500 ? "chase" : "skip" },
      }); n++;
      await appendReceipt({
        agentId: "agent-gamma",
        action: "draft",
        target,
        input: { ev, verdict: ev > 500 ? "chase" : "skip" },
        output: { outline: ["problem", "build", "demo", "submit"], title: b.title },
      }); n++;
    }
    return NextResponse.json({ seeded: n, targets: targets.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
