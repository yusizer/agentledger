"use client";

import type { Receipt, VerifyResult } from "@/lib/types";

const AGENT_HUE: Record<string, string> = {
  "agent-alpha": "from-indigo-400/70 to-violet-500/70",
  "agent-beta": "from-cyan-400/70 to-sky-500/70",
  "agent-gamma": "from-fuchsia-400/70 to-pink-500/70",
  "agent-delta": "from-amber-400/70 to-orange-500/70",
};

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
    return <p className="text-slate-500 text-sm py-6 text-center">No receipts yet — seed the demo or append an action.</p>;
  }
  return (
    <div className="space-y-1">
      {receipts.map((r, i) => {
        const st = statusOf(r.seq);
        const ok = verify ? st?.ok : true;
        return (
          <div key={r.seq}>
            {i > 0 && <div className="ml-4 h-3 w-[2px] chain-link rounded-full" />}
            <a
              href={`/verify?id=${r.receipt_id}`}
              className={`panel panel-hover rounded-lg px-3 py-2.5 flex flex-wrap items-center gap-2.5 text-sm ${
                ok ? "" : "glow-bad"
              }`}
            >
              <span className={`text-xs font-bold w-7 tabular-nums ${ok ? "text-emerald-400" : "text-rose-400"}`}>
                #{r.seq}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[11px] font-medium text-white bg-gradient-to-r ${
                  AGENT_HUE[r.agent_id] ?? "from-slate-500/70 to-slate-600/70"
                }`}
              >
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
