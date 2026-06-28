"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Receipt, VerifyResult } from "@/lib/types";
import { ChainViz } from "@/components/ChainViz";

interface AgentStat {
  agent_id: string;
  count: number;
  lastTs: number;
}

const AGENT_OPTIONS = ["agent-alpha", "agent-beta", "agent-gamma", "agent-delta"];
const ACTION_OPTIONS = ["scan", "rank", "draft", "submit", "claim", "verify"];

export default function Home() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [agents, setAgents] = useState<AgentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [agentId, setAgentId] = useState("agent-alpha");
  const [action, setAction] = useState("scan");
  const [target, setTarget] = useState("bounty:new");
  const [tamperSeq, setTamperSeq] = useState(2);

  const fetchAll = useCallback(async () => {
    const [r, v, a] = await Promise.all([
      fetch("/api/receipts", { cache: "no-store" }).then((x) => x.json()).catch(() => []),
      fetch("/api/verify", { cache: "no-store" }).then((x) => x.json()).catch(() => null),
      fetch("/api/agents", { cache: "no-store" }).then((x) => x.json()).catch(() => []),
    ]);
    setReceipts(r as Receipt[]);
    setVerify(v as VerifyResult | null);
    setAgents(a as AgentStat[]);
  }, []);

  useEffect(() => {
    (async () => {
      await fetchAll();
      setLoading(false);
    })();
  }, [fetchAll]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
      await fetchAll();
    } finally {
      setBusy(null);
    }
  };

  const append = () =>
    run("append", () =>
      fetch("/api/receipt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentId,
          action,
          target,
          input: { source: "ui", at: Date.now() },
          output: { ok: true },
        }),
      }),
    );

  // 5 concurrent appends — exercises DSQL OCC: all 5 land with sequential seqs
  // and no gaps; losers retried against the new tail.
  const stress = () =>
    run("stress", () =>
      Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          fetch("/api/receipt", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              agentId: AGENT_OPTIONS[i % AGENT_OPTIONS.length],
              action: "claim",
              target: `bounty:race-${i}`,
              input: { slot: i },
              output: { attempted: true },
            }),
          }),
        ),
      ),
    );

  const seed = () => run("seed", () => fetch("/api/seed", { method: "POST" }));
  const tamper = () =>
    run("tamper", () =>
      fetch("/api/tamper", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ seq: Number(tamperSeq) }),
      }),
    );

  const chainOk = verify?.ok ?? true;
  const affected = verify ? verify.receipts.filter((r) => !r.ok).length : 0;
  const lastTs = useMemo(() => {
    if (!receipts.length) return null;
    return Math.max(...receipts.map((r) => r.ts));
  }, [receipts]);

  return (
    <main className="min-h-screen max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Agent<span className="text-brand">Ledger</span>
          </h1>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-800/70 border border-slate-700 rounded-full px-2.5 py-1">
            <span className={`h-1.5 w-1.5 rounded-full ${chainOk ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
            {chainOk ? "chain intact" : "tampered"}
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Tamper-evident attestation ledger for AI agents — every action signed into a hash-chain on
          Amazon Aurora DSQL (OCC). Verify, detect tamper, prove trust. Built with Vercel v0 + AWS DSQL for H0.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="panel rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{loading ? "—" : receipts.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">receipts</div>
        </div>
        <div className="panel rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{loading ? "—" : agents.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">agents</div>
        </div>
        <div className="panel rounded-lg p-4">
          <div className={`text-2xl font-bold ${chainOk ? "text-emerald-400" : "text-rose-400"}`}>
            {loading ? "—" : chainOk ? "OK" : "BROKEN"}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">chain verify</div>
        </div>
        <div className="panel rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{loading || !verify ? "—" : verify.total}</div>
          <div className="text-xs text-slate-400 mt-0.5">verified blocks</div>
        </div>
      </div>

      {/* Verify banner */}
      <div
        className={`panel rounded-lg p-4 mb-5 flex items-center justify-between gap-3 ${
          chainOk ? "border-emerald-500/40" : "border-rose-500/60"
        }`}
      >
        <div>
          {loading ? (
            <span className="text-slate-400">Verifying chain…</span>
          ) : chainOk ? (
            <span className="text-emerald-300 font-semibold">
              ✓ Chain intact — {verify?.total ?? 0} receipts verified, hashes recomputed and matched.
            </span>
          ) : (
            <span className="text-rose-300 font-semibold">
              ⚠ TAMPER DETECTED at #{verify?.brokenAt} — {affected} receipt{affected === 1 ? "" : "s"} no longer match the chain.
            </span>
          )}
        </div>
        <button
          onClick={() => run("verify", () => fetch("/api/verify", { cache: "no-store" }))}
          disabled={!!busy}
          className="text-xs text-brand border border-brand/40 rounded px-3 py-1.5 hover:bg-brand/10 disabled:opacity-50"
        >
          {busy === "verify" ? "…" : "re-verify"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          <div className="panel rounded-lg p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Demo controls</h2>
            <button
              onClick={seed}
              disabled={!!busy}
              className="w-full text-sm text-brand border border-brand/40 rounded px-3 py-2 hover:bg-brand/10 mb-2 disabled:opacity-50"
            >
              {busy === "seed" ? "seeding…" : "↻ Re-seed demo agents (3 × 10 real bounties)"}
            </button>
            <div className="flex items-center gap-2 mt-3">
              <input
                type="number"
                min={1}
                value={tamperSeq}
                onChange={(e) => setTamperSeq(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm w-20"
                aria-label="tamper seq"
              />
              <button
                onClick={tamper}
                disabled={!!busy}
                className="flex-1 text-sm text-rose-300 border border-rose-500/40 rounded px-3 py-1.5 hover:bg-rose-500/10 disabled:opacity-50"
              >
                {busy === "tamper" ? "…" : "⚠ Tamper receipt #"}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Mutates a historical receipt without rehashing — then re-verify to see the chain break.
            </p>

            <div className="border-t border-slate-700 my-3" />

            <h3 className="text-xs font-semibold text-slate-300 mb-2">Append an agent action</h3>
            <div className="flex flex-col gap-2 text-sm">
              <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5">
                {AGENT_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={action} onChange={(e) => setAction(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5">
                {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <input value={target} onChange={(e) => setTarget(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5" />
              <button onClick={append} disabled={!!busy} className="text-sm text-emerald-300 border border-emerald-500/40 rounded px-3 py-1.5 hover:bg-emerald-500/10 disabled:opacity-50">
                {busy === "append" ? "…" : "+ Append receipt"}
              </button>
              <button onClick={stress} disabled={!!busy} className="text-sm text-amber-300 border border-amber-500/40 rounded px-3 py-1.5 hover:bg-amber-500/10 disabled:opacity-50">
                {busy === "stress" ? "…" : "⚡ Stress: 5 concurrent (OCC)"}
              </button>
            </div>
          </div>

          <div className="panel rounded-lg p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Agents</h2>
            {loading ? (
              <p className="text-slate-500 text-xs">loading…</p>
            ) : agents.length === 0 ? (
              <p className="text-slate-500 text-xs">none — seed the demo.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {agents.map((a) => (
                  <li key={a.agent_id} className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-brand/20 text-brand text-[11px] font-medium">{a.agent_id}</span>
                    <span className="text-slate-400 text-xs">{a.count} receipts</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="panel rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-200">Receipt chain</h2>
              {lastTs && (
                <span className="text-[11px] text-slate-500">
                  last action {new Date(lastTs).toLocaleTimeString()}
                </span>
              )}
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-slate-800/60 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <ChainViz receipts={receipts} verify={verify} />
            )}
          </div>
        </div>
      </div>

      <footer className="mt-10 text-center text-xs text-slate-600">
        AgentLedger · H0: Hack the Zero Stack · Vercel v0 + Amazon Aurora DSQL (OCC + hash-chain) ·{" "}
        <a className="hover:text-brand" href="https://github.com/yusizer/agentledger" target="_blank" rel="noreferrer">GitHub</a>
      </footer>
    </main>
  );
}
