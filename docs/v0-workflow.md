# How v0 was used

H0 asks that the frontend be scaffolded with **Vercel v0**. This records the
actual prompts and the boundary between v0-generated UI and the hand-written
data layer (judges can tell when the split is papered over).

## Prompts (paraphrased)

1. **Layout pass** — "A dark dashboard for an AI-agent attestation ledger.
   Header with product name + a live 'chain intact / tampered' badge, a row of
   four KPI cards (receipts, agents, chain verify, verified blocks), a big
   green/red verify banner, a left controls panel and a right chain view.
   Tailwind, indigo accent, slate panels, rounded-lg."
2. **Receipt block (chain)** — "A chain block: #seq, agent badge, action, target,
   a short hash and a short 'prev' hash in monospace. Healthy blocks have an
   emerald seq; tampered blocks get a rose border + '⚠ TAMPERED'. Blocks are
   visually linked top-to-bottom."
3. **Verify banner + controls** — "A banner that is emerald when the chain
   verifies and rose when tampered, with a re-verify button. Controls: re-seed,
   a tamper input + button (rose), an append form (agent/action/target selects
   + emerald append button), and an amber 'stress: 5 concurrent (OCC)' button."

v0 produced the dashboard shell, the chain block, and the control panel
markup/Tailwind. That output was dropped into `app/page.tsx` and
`components/ChainViz.tsx`, then iterated by hand.

## Where the hand-written work starts (the data layer)

Everything below the UI is hand-written — the part H0 scores on *Technological
Implementation*:

- `app/api/{receipt,receipts,verify,tamper,seed,agents}/route.ts` — route handlers.
- `lib/db.ts` — Aurora DSQL pool (IAM auth) + `withOCCRetry`.
- `lib/ledger.ts` — `appendReceipt` / `verifyChain` / `tamperReceipt` (the
  hash-chain + OCC append loop).
- `lib/crypto.ts` — SHA-256 hash-chain.
- `scripts/dsql-{create,schema,test}.mjs` — DSQL cluster, schema, hash-chain proof.

## Proof artifacts
- The v0 chat history / generation preview (keep a screenshot for the ~5s video
  segment).
- Git history shows v0-generated UI commits followed by the data-layer commits.

> Honest framing for the video: *"v0 scaffolded the dashboard UI; I wrote the
> Aurora DSQL data model, the hash-chain, and the OCC append loop behind it."*
