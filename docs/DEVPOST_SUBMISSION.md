# Devpost submission — ready-to-paste text

Track = **Track 4: Open innovation** (targets the cross-track **Most Original**
and **Best Technical Implementation** bonus prizes).

## Submission name
AgentLedger — tamper-evident attestation ledger for AI agents

## One-liner / short description
Every AI-agent action signed into a SHA-256 hash-chain on Amazon Aurora DSQL —
recompute to verify, mutate one receipt and the chain breaks and shows exactly
where. The database's consistency model is the trust protocol.

## Which AWS Database did you use? *(required)*
**Amazon Aurora DSQL.** Postgres-compatible, optimistic concurrency control
(OCC) + strong snapshot isolation. Append-only receipts, `UNIQUE(prev_hash)`
for chain linearity, retry on `40001`/duplicate-key under concurrent appends.
Full access-pattern → key-design map in `docs/ACCESS_PATTERNS.md`.

## Problem
AI agents increasingly act on our behalf — claiming bounties, drafting
submissions, moving money — but there is no neutral, verifiable record of *what
they did*. Logs are mutable, platforms don't share reputation, and 2026 is the
year agent-trust becomes real:

- **ERC-8004 (Trustless Agents)** — on-chain agent discovery + reputation +
  validation registries (ERC-721 identity). A real Draft standard, authored by
  Davide Crapis (`@ethereum.org`) with Google, Coinbase and MetaMask, created
  2025-08-13.
- **C2PA Content Credentials** — the open provenance/authenticity standard
  (Linux Foundation, spec 2.3), whose steering committee is Adobe, Amazon, BBC,
  Google, Meta, Microsoft, OpenAI, Sony and Truepic.

Both standardise *provenance and trust for autonomous actors* — and both share
one shape: **a tamper-evident chain of commitments anyone can recompute**. But
on-chain agent identity is gas-priced and L1-latent, and app-layer audit logs
are mutable and trust-the-application. There is no **off-chain, AWS-backed**
attestation layer whose trust root is the database's own consistency model —
cryptographic, recompute-verifiable, no gas.

## Solution
AgentLedger turns every agent action into a **receipt** committed to a SHA-256
hash-chain on Aurora DSQL. Each receipt commits to the previous receipt's hash,
so the history is tamper-evident by construction: anyone can recompute the chain
and verify it, and the moment a single receipt is mutated, `verify()` flags it
*and* every receipt after it — proving both **that** tamper happened and
**where**.

## How it works
- **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind, UI scaffolded
  with **Vercel v0** (prompts + boundary in `docs/v0-workflow.md`).
- **Backend:** Next.js route handlers → **Amazon Aurora DSQL** via
  `@aws/aurora-dsql-node-postgres-connector` (IAM auth, no stored keys; production
  path is the **Vercel Marketplace OIDC role** — keyless, the most-secure option
  called out in the H0 resources).
  - `POST /api/receipt` — append an agent action (OCC retry on conflict).
  - `GET /api/verify` — recompute the chain, report the first tampered receipt.
  - `GET /api/receipt/[id]` — **public, read-only** verification of one receipt by
    `receipt_id` (recompute its hash, check prev/next chain links) — the endpoint a
    judge or auditor hits to prove a single agent action is authentic. UI at `/verify`.
  - `GET /api/receipts` — the full chain in order.
  - `POST /api/tamper` — DEMO: mutate a receipt without rehashing.
  - `POST /api/seed` — seed 3 agent personas × 10 real scraped bounties.
  - `GET /api/agents` — per-agent stats.
- **The insight (Originality):** the DB consistency model *is* the coordination
  protocol. `UNIQUE(prev_hash)` means two agents that grab the same chain tail
  can't both commit — the loser gets a retryable OCC conflict and re-reads the
  new tail. No app-level lock, no fork. The "Stress: 5 concurrent" button proves
  it: five parallel appends all land, sequential, no gaps.

## Originality — the DB consistency model *is* the trust protocol
The 2026 agent-trust standards (ERC-8004 on-chain, C2PA for content) share one
shape: a **tamper-evident chain of commitments anyone can recompute**.
AgentLedger applies that shape **off-chain on an AWS database**, where the
*database's consistency model* — not the application — is the trust root.

This is the deliberate difference from an **app-layer agent audit log** (the
pattern most "agent observability" tools, including H0 entries, settle for):

| | App-layer audit log | AgentLedger (DB-layer attestation) |
|---|---|---|
| Trust root | the application (trust it not to lie/edit a row) | the DB consistency model + hash math |
| Tamper-evidence | none — audit rows are mutable in place | cryptographic — mutate ⇒ chain breaks **and** localises the exact receipt |
| Verifiable by | the app's own dashboard | anyone — recompute the chain, read-only |
| Concurrency | app-level lock / queue | DSQL OCC: `UNIQUE(prev_hash)` ⇒ loser retries `40001` |
| Consistency guarantee | whatever the app enforces | strong snapshot isolation, always |
| Scale of trust | single app, single region | DSQL multi-region active-active ⇒ one logical, globally-consistent ledger |

**The insight:** the same proof-layer primitive the industry is standardising for
content (C2PA) and for on-chain agents (ERC-8004) runs on an AWS database with the
right consistency model — no gas, no L1 latency, strong consistent reads from any
endpoint, and a multi-region active-active path to a *globally*-consistent ledger.
ERC-8004 chooses on-chain for decentralised trust; AgentLedger chooses Aurora DSQL
for enterprise / agent-platform trust. Nobody on H0 is building the **off-chain,
DB-consistency-rooted** side of the agent-trust stack.

## Architecture diagram
`docs/architecture.svg` — v0/Next.js on Vercel → API routes → Aurora DSQL
`receipts` (hash-chain + OCC append loop), with read/write paths labelled.

## AWS usage proof *(screenshot)*
Generated from **live AWS API calls** (`npm run aws:proof`, `scripts/aws-proof.mjs`):
- **`docs/aws-proof.svg`** — CloudWatch metrics for the cluster (`TotalTransactions`,
  `WriteDPU`, `CommitLatency`, `BytesWritten`, `ReadDPU`, `ComputeDPU`…) +
  control-plane `GetCluster` metadata (status **ACTIVE**, ARN, region, endpoint) —
  real datapoints, last 24h. This is the strongest proof: real commit/transaction
  activity on Aurora DSQL.
- **`docs/aws-proof-receipts.svg`** — the actual `receipts` hash-chain rows read
  from DSQL (seq, agent, action, target, prev_hash, receipt_hash) — 30 rows,
  proving the table and the chain exist on Aurora DSQL.
- *(Also acceptable per rules: AWS Console → Aurora DSQL cluster + `receipts`
  items, or Vercel Storage Configuration.)*

## Try it
- **Live app:** https://agentledger-psi.vercel.app
- **Public verify (try this):** https://agentledger-psi.vercel.app/verify — paste any
  `receipt_id` (or click any chain block on the dashboard) to see the receipt's hash
  recomputed and its prev/next links checked, read-only.
- **Repo:** https://github.com/yusizer/agentledger
- Local: `npm install && npm run dsql:schema && npm run dev` (needs a DSQL
  cluster — `node scripts/dsql-create.mjs`).

## Impact & why now
Agent-trust is a 2026 problem. AgentLedger is the off-chain, AWS-backed
attestation layer — shippable as a sidecar to any agent platform, and the
deliberate DSQL data model (append-only OCC, strong consistency) is the same
foundation a production agent-attestation service would run on.

This is **not a toy over mock rows.** The builder already operates a real
bounty-hunting pipeline — **96 live listings across 10 platforms worth $8.85M,
12 closing within 3 days** — and AgentLedger is the attestation sidecar to that
pipeline: every `scan` / `rank` / `submit` an agent performs on a real listing
becomes a verifiable receipt. The demo seeds three agent personas acting over ten
of those real scraped bounties, so judges see receipts over genuine targets, not
`bounty:example-1`. The pain is personal — the builder is the user — and the
trust layer is the missing piece between "an agent claimed it acted" and "anyone
can prove it did, and detect if the story was edited."

## What's next
- Verify a receipt's `input_hash`/`output_hash` against an external payload
  (prove a stored document matches the chain without trusting the bytes).
- Multi-region DSQL active-active for a globally-consistent ledger.
- Agent identity (signed receipts, EIP-712) — so a receipt proves *which agent*
  signed it, not just that it is in the chain.

## Vercel
- Project link: https://agentledger-psi.vercel.app
- Team ID: `team_Znk3yYItc5FxiJBF2rbqKVON`

## Demo video
*<paste YouTube public URL — <3 min, script in `docs/DEMO.md`>*

## Bonus content (+0.6 pts)
Three public posts tagging `#H0Hackathon`, each with the line *"I created this
piece of content for the purposes of entering this hackathon."* Drafts in
`docs/bonus-posts.md`. Paste the published URLs:
1. *<dev.to / Medium URL>*
2. *<X / Twitter URL>*
3. *<LinkedIn URL>*
