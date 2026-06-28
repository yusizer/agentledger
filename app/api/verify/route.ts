import { NextResponse } from "next/server";
import { verifyChain } from "@/lib/ledger";

export const dynamic = "force-dynamic";

/** GET /api/verify — recompute the hash-chain and report the first tampered
 *  receipt (if any). A mutation at seq N breaks N and everything after it. */
export async function GET() {
  try {
    return NextResponse.json(await verifyChain());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
