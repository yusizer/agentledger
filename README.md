# AgentLedger — tamper-evident attestation ledger for AI agents

Every action an AI agent takes is signed into a **hash-chain receipt** on
**Amazon Aurora DSQL** (optimistic concurrency control). Anyone can recompute
the chain and verify it — or, the moment a single receipt is mutated, detect
**exactly where** the tamper happened. Built for **H0: Hack the Zero Stack**
(Vercel v0 + AWS DSQL).

> Problem: AI agents increasingly act on our behalf — claiming bounties,
> drafting submissions, moving money — but there is no neutral, verifiable
> record of *what they did*. Logs are mutable, platforms don't share reputation,
> and 2026 is the year agent-trust becomes real (ERC-8004/8263, agent reputation
> protocols) — almost all of it on-chain. AgentLedger is the **off-chain,
> AWS-backed** attestation layer: append-only, OCC-serial, tamper-evident by
> construction.

## Why Aurora DSQL (the deliberate choice)

This is the insight the H0 judges (AWS DB specialists) score on:

- **Append-only, low-contention writes are the ideal OCC workload** — exactly
  what AWS recommends for DSQL. Each receipt is an `INSERT` (never an in-place
  `UPDATE` of a hot row), so distributed OCC commits without lock contention.
- **Serializable snapshot isolation + OCC** keeps the chain linear under
  concurrent appends: two agents that read the same tail both try to `INSERT`
  with the same `prev_hash`; the `UNIQUE(prev_hash)` constraint turns the loser
  into a retryable `40001` (OC000) — the app re-reads the new tail and retries.
  **The database's consistency model *is* the coordination protocol.**
- **Strong, consistent reads from any endpoint** mean `verify()` recomputes the
  chain and always sees the committed history — no eventual-consistency gap
  where a tamper could hide.

A DynamoDB conditional write gives OCC on one item; DSQL gives multi-row,
lock-free, strongly-consistent OCC across the whole chain — the "only-DSQL-can-
do-this" demo.

## Stack
- **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind. UI scaffolded with **v0**.
- **Database:** **Amazon Aurora DSQL** (Postgres-compatible, OCC, strong snapshot isolation).
- **Connector:** `@aws/aurora-dsql-node-postgres-connector` (IAM auth, no stored keys).
- **Deploy:** Vercel.

## Architecture
```
v0 / Next.js (Vercel)  →  API Routes (/api/receipt, /api/receipts, /api/verify, /api/tamper, /api/seed, /api/agents)
                                       │
                                       ▼
                            Amazon Aurora DSQL  (OCC + strong snapshot isolation)
                            ┌────────────────────────┐
                            │ receipts               │
                            │  seq BIGINT PK         │
                            │  prev_hash   UNIQUE ──┐│  ← chain link (UNIQUE => no fork)
                            │  receipt_hash UNIQUE  ││
                            │  agent_id, action,    ││
                            │  target, input_hash,  ││
                            │  output_hash, payload,││
                            │  ts                   ││
                            └───────────────────────┘│
                                                     │
   verify(): recompute receipt_hash = sha256(prev_hash‖agent‖action‖target‖input_hash‖output_hash‖ts)
              compare to stored; first mismatch = tampered seq; break propagates forward
```
> Full diagram: `docs/architecture.svg`. Data model & access patterns: `docs/ACCESS_PATTERNS.md`.

## The hash-chain (tamper-evidence)

```
receipt_hash(n) = SHA-256( prev_hash(n) || agent_id || action || target || input_hash || output_hash || ts )
prev_hash(n)    = receipt_hash(n-1)        # genesis = 0^64
```

- `input_hash`/`output_hash` commit the agent's I/O (payload stored alongside,
  but the *hash* is what's chained, so you can prove a payload matches without
  trusting the stored bytes).
- Mutate any field of receipt #N (e.g. the demo "tamper" button changes
  `action`) → its recomputed hash no longer matches the stored `receipt_hash`,
  AND every later receipt's `prev_hash` link breaks → `verify()` flags #N and
  the entire suffix. Tamper-evident **and** tamper-localising.

## OCC append (concurrent agents don't fork the chain)

```
appendReceipt():
  repeat:
    tail = SELECT seq, receipt_hash FROM receipts ORDER BY seq DESC LIMIT 1
    seq = tail.seq + 1 ; prev = tail.receipt_hash
    INSERT (seq, prev_hash=prev, receipt_hash=hash(prev,…), …)
    on 40001/OC000 (unique prev_hash taken by a concurrent commit): retry
```

The **Stress: 5 concurrent** button fires 5 parallel appends — all 5 land with
sequential `seq`s and no gaps; the losers retried against the new tail. That's
DSQL OCC making the chain linear under contention.

## Setup

### 1. Install
```bash
npm install
```

### 2. Create an Aurora DSQL cluster + schema
```bash
# create cluster (free tier: 100k DPUs/mo + 1GB) — prints DSQL_ENDPOINT/IDENTIFIER
node scripts/dsql-create.mjs
# put PGHOST/PGUSER/PGDATABASE/PGPORT + AWS creds in .env.local (see .env.example)
# create the receipts table
npm run dsql:schema
```

### 3. Environment (.env.local)
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
PGHOST=<cluster-endpoint>      # e.g. xxx.dsql.us-east-1.on.aws
PGUSER=admin
PGDATABASE=postgres
PGPORT=5432
```
> For production keyless, use the Vercel Marketplace AWS OIDC role
> (`@vercel/oidc-aws-credentials-provider`) instead of stored keys — see
> `lib/db.ts` comment.

### 4. Run / deploy
```bash
npm run dev      # local
npm run build    # production build
# Vercel: git push → auto-deploy (or `vercel`)
# after deploy: POST /api/seed to load the demo chain
```

## Demo flow (<3 min — see `docs/DEMO.md`)
1. **Re-seed** → 3 agent personas act over 10 real scraped bounties = 30 receipts.
2. **Verify** → ✓ chain intact, all hashes recomputed and matched.
3. **Stress (5 concurrent)** → OCC: all 5 append, no gaps, chain stays linear.
4. **Tamper #N** → **Verify** → ⚠ TAMPER DETECTED at #N, suffix broken.
5. **Re-seed** → chain healthy again.

## H0 submission checklist
- [x] Public GitHub repo (this) + LICENSE + architecture
- [ ] Deployed Vercel project link + Team ID
- [ ] Demo video <3 min (YouTube, public) — `docs/DEMO.md`
- [x] Architecture diagram — `docs/architecture.svg`
- [x] Data model / access-pattern doc — `docs/ACCESS_PATTERNS.md`
- [ ] Screenshot proving AWS DSQL usage (Vercel Storage Config / AWS Console / CloudWatch)
- [ ] Text description stating which AWS Database was used (**Aurora DSQL**)
- [ ] Track: Open innovation (targets **Most Original** + **Best Technical Implementation**)
- [ ] Bonus: 1–3 #H0Hackathon posts (+0.6 pts)

## Tracks & judging
- **Track:** Open innovation — a genuine insight about the stack (DB consistency
  model = trust protocol).
- **Judging mapped:**
  - **Tech Implementation (tiebreak)** → deliberate DSQL data model: append-only
    OCC, `UNIQUE(prev_hash)` chain-linearity, serializable snapshot isolation,
    retry on 40001, recompute-and-compare verify.
  - **Design** → dark dashboard, live chain visualization, green/red verify
    banner, tamper animation, OCC stress test.
  - **Impact & Real-world Applicability** → agent-trust is a 2026 problem
    (ERC-8004/8263, agent reputation); off-chain AWS attestation layer; works
    on real bounty data (the hunter radar we already run).
  - **Originality** → "DB consistency model = trust protocol" — nobody on H0 is
    building agent attestation; tamper-evident hash-chain on DSQL is the insight.

## Project layout
```
app/
  layout.tsx, page.tsx, globals.css        dashboard (KPIs, verify banner, chain, controls)
  loading.tsx, error.tsx                   route-level states
  opengraph-image.tsx, icon.svg            dynamic OG + favicon
  api/
    receipt/route.ts    POST — append agent action (OCC retry)
    receipts/route.ts   GET  — full chain
    verify/route.ts     GET  — recompute + detect tamper
    tamper/route.ts     POST — DEMO: mutate a receipt without rehash
    seed/route.ts       POST — seed 3 agents × 10 real bounties
    agents/route.ts     GET  — per-agent counts
components/
  ChainViz.tsx                             chain blocks with hash + verify status
lib/
  db.ts          Aurora DSQL pool (IAM auth) + withOCCRetry
  ledger.ts      appendReceipt / listReceipts / verifyChain / tamperReceipt
  crypto.ts      SHA-256 hash-chain
  types.ts
scripts/
  dsql-create.mjs   create cluster
  dsql-schema.mjs   create receipts table
  dsql-test.mjs     hash-chain proof (append/verify/tamper)
data/
  bounties.json     real scraped listings (agent targets)
docs/
  DEMO.md, ACCESS_PATTERNS.md, architecture.svg
```

## License
MIT — see `LICENSE`.
