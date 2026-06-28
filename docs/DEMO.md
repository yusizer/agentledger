# AgentLedger — Demo Video Script (H0: Hack the Zero Stack)

**Length:** < 3:00 (target 2:45). **YouTube public.** Screen-record the **running
app** (not slides). **Voiceover:** English.

App live at the production domain. Keep it seeded + verified-intact before
recording (POST /api/seed, then confirm the banner is green).

## Setup before recording
- App running on the production URL, seeded (30 receipts), verify banner GREEN.
- AWS console open on the DSQL cluster → `receipts` table items (for the proof shot).
- Browser clean, window ~1440×900.

## Script

| Time | Section | Voiceover (say) | On screen (show) |
|------|---------|-----------------|------------------|
| 0:00–0:20 | **Problem** | "AI agents increasingly act on our behalf — claiming bounties, drafting submissions, moving money. But there's no neutral, verifiable record of what they did. Logs are mutable. Platforms don't share reputation. How do you *prove* what your agent did — and detect if someone changed the story?" | Quick cuts: an agent "acting", a log file being edited, a tampered record. |
| 0:20–0:35 | **Solution** | "AgentLedger. Every agent action is signed into a SHA-256 hash-chain on Amazon Aurora DSQL. Recompute the chain to verify. Mutate one receipt — the chain breaks and shows exactly where." | Title card: "AgentLedger — prove what your agents did." |
| 0:35–1:20 | **App + chain** | "Here's the dashboard. Three agent personas — scanner, valuator, submitter — acting over real scraped bounty listings. Each action is a receipt: agent, action, target, and a hash that commits to the previous receipt's hash. The chain is intact — thirty receipts, all hashes recomputed and matched. Every block is click-through — a public, read-only verify page that recomputes that one receipt's hash and checks its neighbours." | Show dashboard: KPIs (30 receipts, 3 agents, OK), green verify banner, scroll the chain blocks (hash + prev hash per block); click one block → `/verify?id=…` → shows ✓ hash matches + ✓ prev/next links. |
| 1:20–1:55 | **Aurora DSQL + OCC** | "The backend is Amazon Aurora DSQL — Postgres-compatible, with optimistic concurrency control and strong snapshot isolation. The insight: the database's consistency model *is* the coordination protocol. A UNIQUE constraint on prev_hash means two agents that grab the same tail can't both commit — the loser gets a retryable conflict and re-reads the new tail. Watch: five concurrent appends — all five land, sequential, no gaps, and the UI reports the measured OCC retry count, not an assertion." | Click **"Stress: 5 concurrent (OCC)"** → watch receipts 31–35 appear in order → verify stays green → point at the amber OCC-metric line ("5/5 landed · N OCC retries · no gaps") and the no-gaps sequence. |
| 1:55–2:30 | **Tamper-evident demo** | "Now the tamper test. I mutate one historical receipt — change its action — *without* recomputing its hash. Re-verify. The chain breaks at receipt five, and every receipt after it is flagged. Tamper-evident, and it tells you exactly where." | Enter `5` → click **"⚠ Tamper receipt #"** → banner turns RED "⚠ TAMPER DETECTED at #5" → scroll chain: #5 and onward marked ⚠ TAMPERED. |
| 2:30–2:45 | **AWS proof + close** | "Here's the receipts table in Aurora DSQL, with the real hash-chain rows. AgentLedger — the database consistency model as a trust protocol. H0 Hackathon." | AWS console → DSQL `receipts` items (scroll) → final card: app URL + repo URL + `#H0Hackathon`. |

## Judging criteria — mapped
- **Tech Implementation (tiebreak)** → deliberate DSQL data model: append-only OCC, `UNIQUE(prev_hash)` chain linearity, retry on 40001/duplicate-key, recompute-and-compare verify. *(1:20–1:55, 2:30)*
- **Design** → dark dashboard, live chain visualization, green/red verify banner, tamper animation. *(0:35–2:30)*
- **Impact & Real-world Applicability** → agent-trust is a 2026 problem; off-chain AWS attestation layer; works on real bounty data. *(0:00–0:20)*
- **Originality** → "DB consistency model = trust protocol" — other H0 agent entries settle for an app-layer audit log; AgentLedger roots trust in the DB consistency model + a cryptographic, recompute-verifiable hash-chain (the off-chain, AWS-native side of what ERC-8004 / C2PA are standardising). *(0:20–0:35, 1:20)*

## After recording
1. Upload to YouTube → **Public** (not unlisted).
2. Paste the video URL into the Devpost submission.
3. Re-seed the live app (POST /api/seed) so judges see a clean, intact chain.

## Bonus posts (+0.6 pts)
Publish 1–3 posts tagging `#H0Hackathon`, each with the line *"I created this
piece of content for the purposes of entering this hackathon."* Drafts in
`docs/bonus-posts.md`.
