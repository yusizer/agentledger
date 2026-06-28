# H0 bonus posts (+0.6 pts — publish 1–3, each 0.2)

**Rules (mandatory or the point is NOT awarded):**
- Published **publicly** (not unlisted/private).
- Contains the exact line: **"I created this piece of content for the purposes of entering this hackathon."**
- Tagged **#H0Hackathon**.
- Platforms: dev.to / Medium / LinkedIn / X (Twitter) / builder.aws.com / YouTube.

Publish all 3 for the full +0.6. Paste the URLs into the Devpost submission.

---

## Post 1 — dev.to / Medium (build story, ~250 words)

**Title:** I built a tamper-evident ledger for AI agents on Amazon Aurora DSQL for H0

I created this piece of content for the purposes of entering this hackathon.

AI agents increasingly act on our behalf — claiming bounties, drafting
submissions — but there's no neutral, verifiable record of what they did. Logs
are mutable; platforms don't share reputation; and almost all of the 2026
agent-trust work (ERC-8004/8263, agent reputation) is on-chain. I wanted an
**off-chain, AWS-backed** attestation layer.

So for **H0: Hack the Zero Stack** I built **AgentLedger**: every agent action
is signed into a SHA-256 hash-chain on **Amazon Aurora DSQL**. Each receipt
commits to the previous receipt's hash, so the history is tamper-evident by
construction — recompute the chain to verify; mutate one receipt and the chain
breaks and shows exactly where.

The part I cared about — because the H0 judges are AWS DB specialists — is the
data model. Aurora DSQL gives optimistic concurrency control + strong snapshot
isolation. The insight: **the database's consistency model is the coordination
protocol**. A `UNIQUE` constraint on `prev_hash` means two agents that grab the
same chain tail can't both commit — the loser gets a retryable `40001`/
duplicate-key conflict and re-reads the new tail. No app-level lock, no fork.
The "Stress: 5 concurrent" button proves it: five parallel appends all land,
sequential, no gaps.

The demo dataset runs over real scraped bounty listings — the hunter radar I
already operate — so it's not a toy. UI scaffolded with Vercel v0; the DSQL data
layer, hash-chain, and OCC loop are hand-written.

Repo + live demo in the submission. #H0Hackathon

---

## Post 2 — X / Twitter

I created this piece of content for the purposes of entering this hackathon.

Built AgentLedger for #H0Hackathon — a tamper-evident ledger for AI agents on
Amazon Aurora DSQL.

Every agent action → SHA-256 hash-chain receipt. Recompute to verify. Tamper one
→ chain breaks, shows exactly where.

The insight: the DB consistency model IS the trust protocol. UNIQUE(prev_hash) +
OCC ⇒ 5 concurrent appends all land, no gaps.

Live demo + repo in my submission. 🧵👇

(Reply 1) Why DSQL: optimistic concurrency control + strong snapshot isolation.
Append-only writes = the ideal OCC workload. UNIQUE prev_hash turns a concurrent
race into a retryable conflict — the loser re-reads the tail and retries. No fork.

(Reply 2) Tamper-evident by construction: receipt_hash commits to the previous
hash. verify() recomputes the whole chain; a mutation at #N breaks N and every
later receipt. #H0Hackathon

---

## Post 3 — LinkedIn

I created this piece of content for the purposes of entering this hackathon.

Where I sharpen full-stack judgment: for the H0: Hack the Zero Stack hackathon
(Vercel v0 + AWS Databases) I built **AgentLedger** — a tamper-evident
attestation ledger for AI agents on Amazon Aurora DSQL.

Every agent action becomes a SHA-256 hash-chain receipt. Recompute the chain to
verify it; mutate one receipt and the chain breaks and tells you exactly where.

The interesting part is the data model. Aurora DSQL's optimistic concurrency
control + strong snapshot isolation make the **database's consistency model the
coordination protocol**: a UNIQUE constraint on the previous-hash link means
concurrent appends can't fork the chain — losers retry against the new tail. Five
parallel appends all land, sequential, no gaps.

The bigger lesson: the difference between "it connects to a database" and "a
deliberate data model" is exactly what specialists notice — so I documented every
access pattern against its DSQL design in the repo, and the demo runs over real
scraped bounty data, not mock rows.

#H0Hackathon — repo and live demo in the submission.
