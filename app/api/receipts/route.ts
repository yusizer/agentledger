import { NextResponse } from "next/server";
import { listReceipts } from "@/lib/ledger";

export const dynamic = "force-dynamic";

/** GET /api/receipts — the full chain, oldest first. */
export async function GET() {
  try {
    return NextResponse.json(await listReceipts());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
