# How v0 was used

H0 asks that the frontend be scaffolded with **Vercel v0**. This records the
actual prompts and the boundary between v0-generated UI and hand-written data
layer (judges can tell when the split is papered over).

## Prompts (paraphrased)

1. **Layout pass** — “A dark dashboard for tracking Web3 bounties and
   hackathons. Header with product name, a row of KPI cards, a filter bar
   (selects + search), and a responsive 3-column grid of listing cards. Tailwind,
   indigo accent, slate panels, rounded-lg, tight spacing.”
2. **Card component** — “A bounty card: platform badge + type, deadline
   countdown chip, two-line title, skill tags, prize, and a save/bookmark button.
   Hover: accent border.”
3. **Countdown chip** — “A small deadline countdown: emerald > 7 days, amber
   ≤ 7, red ≤ 2 with a pulse. Updates every minute.”

v0 produced the dashboard shell, the card, and the chip markup/Tailwind classes.
That output was dropped into `app/page.tsx`, `components/BountyCard.tsx`, and
`components/Countdown.tsx`, then iterated by hand.

## Where the hand-written work starts (the data layer)

Everything below the UI is hand-written — this is the part H0 scores on
*Technological Implementation*:

- `app/api/{bounties,save,saves,seed,stats}/route.ts` — Next.js route handlers.
- `lib/dynamodb.ts` — AWS SDK v3, two tables + two GSIs, conditional writes,
  pagination, Query-vs-Scan access-pattern mapping (see `ACCESS_PATTERNS.md`).
- `scripts/build_seed.py` — normalizes real scraped listings into the seed.
- `scripts/seed.ts` — `BatchWriteItem` loader with `UnprocessedItems` retry.
- Hero KPI aggregation, filter logic, keyboard shortcuts, skeleton/empty/error
  states.

## Proof artifacts

- The v0 chat history / generation preview (keep a screenshot for the demo
  video, ~5s segment).
- v0 → “Sync to GitHub” / project link (paste in README if used).
- Git history shows v0-generated UI commits followed by the data-layer commits.

> Honest framing for the video: *“v0 scaffolded the dashboard UI; I wrote the
> DynamoDB data model and API layer behind it.”*
