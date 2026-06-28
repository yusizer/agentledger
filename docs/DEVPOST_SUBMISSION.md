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
year agent-trust becomes real — **ERC-8004** (Trustless Agents) and **ERC-8263**
(Onchain Proof Layer) anchor agent actions on-chain (~50k gas/anchor, causal
`parent_anchor_id` chains). There is no **off-chain, AWS-backed** equivalent —
same commitment shape, no gas, strong consistency.

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
  `@aws/aurora-dsql-node-postgres-connector` (IAM auth, no stored keys).
  - `POST /api/receipt` — append an agent action (OCC retry on conflict).
  - `GET /api/verify` — recompute the chain, report the first tampered receipt.
  - `GET /api/receipts` — the full chain in order.
  - `POST /api/tamper` — DEMO: mutate a receipt without rehashing.
  - `POST /api/seed` — seed 3 agent personas × 10 real scraped bounties.
  - `GET /api/agents` — per-agent stats.
- **The insight (Originality):** the DB consistency model *is* the coordination
  protocol. `UNIQUE(prev_hash)` means two agents that grab the same chain tail
  can't both commit — the loser gets a retryable OCC conflict and re-reads the
  new tail. No app-level lock, no fork. The "Stress: 5 concurrent" button proves
  it: five parallel appends all land, sequential, no gaps.

## Why now — the ERC-8263 parallel (originality)
ERC-8263 ("Onchain Proof Layer for AI Agents", Draft) defines a minimal on-chain
registry: `anchor(contentHash, metadataHash, agent, sig)` → `anchorId`; `verify()`
is one read; causal chains via `parent_anchor_id`; ~50k gas/anchor. AgentLedger is
the **off-chain AWS-backed equivalent** — same commitment shape, different trust
substrate:

| | ERC-8263 (on-chain) | AgentLedger (Aurora DSQL) |
|---|---|---|
| Commitment | `contentHash`+`metadataHash`+agent sig | `input_hash`+`output_hash`+`agent_id` |
| Causal link | `parent_anchor_id` | `prev_hash` (`UNIQUE` ⇒ no fork) |
| Verify | `verify(anchorId)` view call | `GET /api/verify` recompute chain |
| Concurrency | chain-serialised (1 tx wins) | OCC: loser retries `40001` |
| Cost | ~50k gas/anchor | 100k+ free DPUs/mo (DSQL free tier) |

The insight: the **same proof-layer primitive** Ethereum is standardising on-chain
runs just as well — far cheaper — on an AWS DB with the right consistency model.
ERC-8263 picks on-chain for decentralised trust; AgentLedger picks DSQL for
enterprise/agent-platform trust (verifiable, no gas, no L1 latency, strong reads).

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
- **Repo:** https://github.com/yusizer/agentledger
- Local: `npm install && npm run dsql:schema && npm run dev` (needs a DSQL
  cluster — `node scripts/dsql-create.mjs`).

## Impact & why now
Agent-trust is a 2026 problem. AgentLedger is the off-chain, AWS-backed
attestation layer — shippable as a sidecar to any agent platform, and the
deliberate DSQL data model (append-only OCC, strong consistency) is the same
foundation a production agent-attestation service would run on. The demo dataset
runs over **real scraped bounty listings** (the hunter radar the builder already
operates), so it's not a toy.

## What's next
- Verify a receipt's `input_hash`/`output_hash` against an external payload
  (prove a stored document matches the chain without trusting the bytes).
- Multi-region DSQL active-active for a globally-consistent ledger.
- Agent identity (signed receipts) + a public verify endpoint.

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
