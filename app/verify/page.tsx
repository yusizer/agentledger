"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Receipt } from "@/lib/types";

interface ReceiptLink {
  seq: number;
  receipt_id: string;
  hash: string;
}

interface SingleVerify {
  receipt: Receipt | null;
  expected_hash: string | null;
  hash_ok: boolean;
  prev_link_ok: boolean;
  next_link_ok: boolean;
  prev: ReceiptLink | null;
  next: ReceiptLink | null;
  ok: boolean;
}

function Row({ label, value, mono = true, ok }: { label: string; value: string; mono?: boolean; ok?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 items-start text-xs py-1.5 border-b border-white/[0.06] last:border-0">
      <div className="text-slate-500">{label}</div>
      <div className={`col-span-2 break-all ${mono ? "font-mono" : ""} ${ok === false ? "text-rose-300" : ok === true ? "text-emerald-300" : "text-slate-300"}`}>
        {value}
      </div>
    </div>
  );
}

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [data, setData] = useState<SingleVerify | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (id: string) => {
    const clean = id.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/receipt/${encodeURIComponent(clean)}`, { cache: "no-store" });
      if (res.status === 404) {
        setData(null);
        setError("receipt not found — check the id");
      } else if (!res.ok) {
        setData(null);
        setError(`error (${res.status})`);
      } else {
        setData(await res.json());
      }
    } catch {
      setData(null);
      setError("request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // prefill from ?id= and auto-verify
  useEffect(() => {
    const id = params.get("id");
    if (id) {
      setInput(id);
      verify(id);
    }
  }, [params, verify]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = input.trim();
    verify(id);
    router.push(`/verify?id=${encodeURIComponent(id)}`);
  };

  const r = data?.receipt;

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Verify a <span className="brand-text">receipt</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Public, read-only verification. Paste a <span className="font-mono text-slate-300">receipt_id</span> —
          AgentLedger recomputes its hash from the stored fields and checks the prev/next chain links.
          No mutation, no trust required.
        </p>
      </header>

      <form onSubmit={onSubmit} className="panel rounded-lg p-4 mb-5">
        <label className="block text-xs text-slate-400 mb-1.5">receipt_id</label>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 9a3f...  (UUID)"
            className="flex-1 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-brand-light/40"
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="text-sm text-brand border border-brand/40 rounded px-4 py-2 hover:bg-brand/10 disabled:opacity-50"
          >
            {loading ? "verifying…" : "Verify"}
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Find an id on the dashboard chain, or append a receipt and verify it here.
        </p>
      </form>

      {error && (
        <div className="panel rounded-lg p-4 mb-5 border-rose-500/40">
          <span className="text-rose-300 text-sm font-semibold">⚠ {error}</span>
        </div>
      )}

      {r && data && (
        <>
          <div
            className={`panel rounded-lg p-4 mb-5 border ${data.ok ? "border-emerald-500/40" : "border-rose-500/60"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`h-2 w-2 rounded-full ${data.ok ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
              <span className={`font-semibold ${data.ok ? "text-emerald-300" : "text-rose-300"}`}>
                {data.ok ? "✓ Receipt verified — authentic & correctly linked" : "⚠ Verification failed"}
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-2 text-xs">
              <div className={`rounded px-2.5 py-1.5 border ${data.hash_ok ? "border-emerald-500/30 text-emerald-300" : "border-rose-500/40 text-rose-300"}`}>
                {data.hash_ok ? "✓" : "✗"} hash matches
              </div>
              <div className={`rounded px-2.5 py-1.5 border ${data.prev_link_ok ? "border-emerald-500/30 text-emerald-300" : "border-rose-500/40 text-rose-300"}`}>
                {data.prev_link_ok ? "✓" : "✗"} prev link
              </div>
              <div className={`rounded px-2.5 py-1.5 border ${data.next_link_ok ? "border-emerald-500/30 text-emerald-300" : "border-rose-500/40 text-rose-300"}`}>
                {data.next_link_ok ? "✓" : "✗"} next link
              </div>
            </div>
          </div>

          <div className="panel rounded-lg p-4 mb-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Receipt #{r.seq}</h2>
            <Row label="receipt_id" value={r.receipt_id} />
            <Row label="agent" value={r.agent_id} mono={false} />
            <Row label="action" value={r.action} mono={false} />
            <Row label="target" value={r.target} mono={false} />
            <Row label="timestamp" value={`${new Date(r.ts).toISOString()} (${r.ts})`} mono={false} />
          </div>

          <div className="panel rounded-lg p-4 mb-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Hash-chain proof</h2>
            <Row label="prev_hash" value={r.prev_hash} ok={data.prev_link_ok} />
            <Row label="receipt_hash (stored)" value={r.receipt_hash} ok={data.hash_ok} />
            <Row label="receipt_hash (recomputed)" value={data.expected_hash ?? "—"} ok={data.hash_ok} />
            <Row label="input_hash" value={r.input_hash} />
            <Row label="output_hash" value={r.output_hash} />
            <p className="text-[11px] text-slate-500 mt-3">
              <span className="font-mono">receipt_hash = SHA-256( prev_hash ‖ agent ‖ action ‖ target ‖ input_hash ‖ output_hash ‖ ts )</span>.
              The recomputed hash must match the stored one; the prev link must match the previous receipt&apos;s hash.
            </p>
          </div>

          <div className="panel rounded-lg p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Chain neighbours</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500 mb-1">previous (seq {r.seq - 1})</div>
                {data.prev ? (
                  <a href={`/verify?id=${data.prev.receipt_id}`} className="text-xs font-mono text-brand hover:underline break-all">
                    {data.prev.receipt_id}
                  </a>
                ) : (
                  <span className="text-xs text-slate-600">genesis — none</span>
                )}
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">next (seq {r.seq + 1})</div>
                {data.next ? (
                  <a href={`/verify?id=${data.next.receipt_id}`} className="text-xs font-mono text-brand hover:underline break-all">
                    {data.next.receipt_id}
                  </a>
                ) : (
                  <span className="text-xs text-slate-600">tail — none</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <footer className="mt-10 text-center text-xs text-slate-600">
        <a className="hover:text-brand" href="/">← back to dashboard</a>{" · "}
        AgentLedger · H0: Hack the Zero Stack
      </footer>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">loading…</div>}>
      <VerifyInner />
    </Suspense>
  );
}
