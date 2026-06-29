"use client";

import type { Receipt, VerifyResult } from "@/lib/types";

export function ChainViz({
  receipts,
  verify,
}: {
  receipts: Receipt[];
  verify: VerifyResult | null;
}) {
  // compare as numbers: DSQL returns BIGINT seq as a string in some paths, and a
  // string-vs-number mismatch would make every block render as "tampered" even
  // when the chain is intact.
  const statusOf = (seq: number) => verify?.receipts.find((r) => Number(r.seq) === Number(seq));
  if (!receipts.length) {
    return <p className="text-slate-500 text-sm">No receipts yet — seed the demo or append an action.</p>;
  }
  return (
    <div className="space-y-1">
      {receipts.map((r, i) => {
        const st = statusOf(r.seq);
        const ok = verify ? st?.ok : true;
        return (
          <div key={r.seq}>
            {i > 0 && <div className="ml-4 h-2.5 w-0.5 bg-slate-700" />}
            <a
              href={`/verify?id=${r.receipt_id}`}
              className={`panel rounded-lg p-2.5 flex flex-wrap items-center gap-2 text-sm transition-colors hover:border-brand/60 ${
                ok ? "" : "border-rose-500/60 bg-rose-500/5"
              }`}
            >
              <span className={`text-xs font-bold w-7 ${ok ? "text-emerald-400" : "text-rose-400"}`}>
                #{r.seq}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-brand/20 text-brand text-[11px] font-medium">
                {r.agent_id}
              </span>
              <span className="text-slate-200 font-medium">{r.action}</span>
              <span className="text-slate-500 text-xs truncate flex-1 min-w-[100px]">{r.target}</span>
              <span className="text-[10px] text-slate-400 font-mono">h:{r.receipt_hash.slice(0, 10)}</span>
              <span className="text-[10px] text-slate-600 font-mono">←{r.prev_hash.slice(0, 10)}</span>
              {verify && !ok && (
                <span className="text-[10px] text-rose-400 font-bold ml-1">⚠ TAMPERED</span>
              )}
            </a>
          </div>
        );
      })}
    </div>
  );
}
