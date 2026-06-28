import { NextResponse } from "next/server";
import { verifyReceiptById } from "@/lib/ledger";

export const dynamic = "force-dynamic";

/**
 * GET /api/receipt/[id] — public verification of a single receipt by its stable
 * receipt_id. Returns the receipt, the recomputed hash, and whether the hash +
 * prev/next links match (read-only). The endpoint a judge or auditor hits to
 * prove one agent action is authentic and correctly linked into the chain.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || !/^[0-9a-f-]{8,64}$/i.test(id)) {
      return NextResponse.json({ error: "invalid receipt id" }, { status: 400 });
    }
    const result = await verifyReceiptById(id);
    if (!result.receipt) {
      return NextResponse.json({ error: "receipt not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
