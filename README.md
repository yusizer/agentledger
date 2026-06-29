# AgentLedger — tamper-evident attestation ledger for AI agents

Every action an AI agent takes is signed into a **hash-chain receipt** on
**Amazon Aurora DSQL** (optimistic concurrency control). Anyone can recompute
the chain and verify it — or, the moment a single receipt is mutated, detect
**exactly where** the tamper happened. Built for **H0: Hack the Zero Stack**
(Vercel v0 + AWS DSQL).

> Problem: AI agents increasingly act on our behalf — claiming bounties,
> drafting submissions, moving money — but there is no neutral, verifiable
> record of *what they did*. Logs are mutable, platforms don't share reputation,
> and 2026 is the year agent-trust becomes real: **ERC-8004** (Trustless Agents —
> on-chain agent discovery + reputation + validation, authored by Davide Crapis
> @ethereum.org with Google, Coinbase, MetaMask) and **C2PA Content Credentials**
> (the open provenance standard, Linux Foundation, backed by Adobe / Google /
> Microsoft / OpenAI / Meta / Amazon) both standardise *a tamper-evident chain of
> commitments anyone can recompute*. AgentLedger is the **off-chain, AWS-backed**
> equivalent: the same commitment shape (input + output hashes, agent identity, a
> causal `prev_hash` link) on Aurora DSQL with OCC — no gas, strong consistency,
> and a multi-region active-active path to a globally-consistent ledger.
> Append-only, tamper-evident by construction.

## Why Aurora DSQL (the deliberate choice)

This is the insight the H0 judges (AWS DB specialists) score on:

- **Append-only, low-contention writes are the ideal OCC workload** — exactly
  what AWS recommends for DSQL. Each receipt is an `INSERT` (never an in-place
  `UPDATE` of a hot row), so distributed OCC commits without lock contention.
- **Snapshot isolation + OCC** (PostgreSQL Repeatable Read equivalent) keeps the
  chain linear under concurrent appends: two agents that read the same tail both
  try to `INSERT` with the same `prev_hash`; the `UNIQUE(prev_hash)` constraint
  turns the loser into a retryable `40001` (OC000) — the app re-reads the new tail
  and retries. **The database's consistency model *is* the coordination protocol.**
- **Strong, consistent reads from any endpoint** mean `verify()` recomputes the
  chain and always sees the committed history — no eventual-consistency gap
  where a tamper could hide.
- **Multi-region active-active** — a DSQL peered cluster exposes two Regional
  endpoints as one logical database with concurrent read/write and strong data
  consistency. The same `UNIQUE(prev_hash)` that keeps a single-Region chain
  linear keeps a multi-Region chain linear — agents in `us-east-1` and `eu-west-1`
  appending to one logical chain cannot fork it. That is the off-chain equivalent
  of what ERC-8004 gets from L1 consensus, without gas or L1 latency. (Demo runs
  single-Region; multi-region is the documented production path.)

A DynamoDB conditional write gives OCC on one item; DSQL gives multi-row,
lock-free, strongly-consistent OCC across the whole chain — the deliberate DSQL
fit (Postgres can enforce a hash-chain with `UNIQUE` + serializable isolation;
DSQL adds lock-free OCC and a multi-region active-active path as one logical
database).

## Originality — the DB consistency model *is* the trust protocol

The 2026 agent-trust standards share one shape: a **tamper-evident chain of
commitments anyone can recompute**. **ERC-8004 (Trustless Agents)** puts agent
discovery + reputation + validation in on-chain registries (ERC-721 identity) —
a real Draft, authored by Davide Crapis (`@ethereum.org`) with Google, Coinbase
and MetaMask, created 2025-08-13. **C2PA Content Credentials** is the open
provenance/authenticity standard (Linux Foundation, spec 2.3, steering committee
Adobe / Amazon / BBC / Google / Meta / Microsoft / OpenAI / Sony / Truepic).

AgentLedger applies that same shape **off-chain on an AWS database**, where the
*database's consistency model* — not the application — is the trust root. That is
the deliberate difference from an **app-layer agent audit log** (the pattern most
"agent observability" tools settle for, including H0 entries):

| | App-layer audit log | AgentLedger (DB-layer attestation) |
|---|---|---|
| Trust root | the application (trust it not to lie/edit a row) | the DB consistency model + hash math |
| Tamper-evidence | none — audit rows are mutable in place | cryptographic — mutate ⇒ chain breaks **and** localises the exact receipt |
| Verifiable by | the app's own dashboard | anyone — recompute the chain, read-only |
| Concurrency | app-level lock / queue | DSQL OCC: `UNIQUE(prev_hash)` ⇒ loser retries `40001` |
| Consistency | whatever the app enforces | strong snapshot isolation, always |
| Scale of trust | single app, single region | DSQL multi-region active-active ⇒ one logical, globally-consistent ledger |

The insight for H0: the **same proof-layer primitive** the industry is
standardising for content (C2PA) and for on-chain agents (ERC-8004) runs on an
AWS database with the right consistency model — no gas, no L1 latency, strong
consistent reads from any endpoint, and a multi-region active-active path to a
*globally*-consistent ledger. ERC-8004 chooses on-chain for decentralised trust;
AgentLedger chooses DSQL for enterprise / agent-platform trust.

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
- [x] Deployed Vercel: https://agentledger-psi.vercel.app · Team ID `team_Znk3yYItc5FxiJBF2rbqKVON`
- [ ] Demo video <3 min (YouTube, public) — `docs/DEMO.md`
- [x] Architecture diagram — `docs/architecture.svg`
- [x] Data model / access-pattern doc — `docs/ACCESS_PATTERNS.md`
- [x] AWS-usage proof — `docs/aws-proof.svg` (CloudWatch metrics + cluster metadata) +
      `docs/aws-proof-receipts.svg` (real hash-chain rows) — generated from live AWS
      API calls via `npm run aws:proof` (see `scripts/aws-proof.mjs`)
- [ ] Text description stating which AWS Database was used (**Aurora DSQL**)
- [ ] Track: Open innovation (targets **Most Original** + **Best Technical Implementation**)
- [ ] Bonus: 1–3 #H0Hackathon posts (+0.6 pts)

## Tracks & judging
- **Track:** Open innovation — a genuine insight about the stack (DB consistency
  model = trust protocol).
- **Judging mapped:**
  - **Tech Implementation (tiebreak)** → deliberate DSQL data model: append-only
    OCC, `UNIQUE(prev_hash)` chain-linearity, snapshot isolation (PG Repeatable
    Read equiv), retry on 40001, recompute-and-compare verify.
  - **Design** → dark dashboard, live chain visualization, green/red verify
    banner, tamper animation, OCC stress test.
  - **Impact & Real-world Applicability** → agent-trust is a 2026 problem
    (ERC-8004, C2PA, agent reputation); off-chain AWS attestation layer; works
    on real bounty data (the hunter radar we already run).
  - **Originality** → "DB consistency model = trust protocol." Other H0 agent
    entries settle for an app-layer audit log; AgentLedger roots trust in the DB
    consistency model + a cryptographic, recompute-verifiable hash-chain — the
    off-chain, AWS-native side of the stack ERC-8004/C2PA are standardising.

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
