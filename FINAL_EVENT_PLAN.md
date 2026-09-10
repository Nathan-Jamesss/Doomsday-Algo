# Doomsday Algorithm — Final Event Plan

**Live site:** https://doomsdayalgorithm-5f1e8.web.app *(deployed and verified end-to-end 2026-09-10)*

**Format:** Drop-in, not synchronized. Students arrive and leave whenever within the window, at their own pace. No group kickoff, no shared clock, no host walking everyone through it together — the site itself carries the full briefing.

**Window:** 12:00 PM – 6:00 PM, September 11, 2026 (fixed by the festival — not extendable).

**Time per team:** ~2.5–3 hours across four rounds. This is deliberately longer than a late arrival can fit — see *Late arrivals* below for how that's handled.

**Cost:** $0. No credit card anywhere in this setup (Firebase Spark plan + a local script instead of paid Cloud Functions).

---

## What a participant actually does

**Round 0 — Set up (5 min).** Land on the site. The landing page is a step-by-step round tracker: each round shown in order with its own instructions, time estimate, and a button into it. Pick a team ID (saved in the browser), download the 6 CSVs — films, characters, appearances, co_appearances, post_credits, roster. Real MCU *shape*, fabricated *facts*; the "Earth-4471" banner on every page warns them not to trust memory.

**Round 1 — Explore (30–45 min, 10 questions).** Every answer is already in the CSVs they just downloaded. Nothing to predict — this round exists to force an actual read of the data: totals per character across 28 films, film-to-film comparisons, cross-file lookups (faction, post-credits teases, survival across every appearance). Answered as probabilities like every other round, graded on submission.

**Round 2 — Predict (60–90 min, 24 questions).** Questions about the hidden Phase 5, which no file contains. 10 survival yes/no, 6 team-up yes/no, 4 "closest partner" multichoice, 4 screentime comparisons. Each answer is a probability, scored with a proper scoring rule (Brier), so bluffing is a losing strategy rather than just bad form. The dataset carries three deliberate traps — a Simpson's paradox, survivorship bias, and a leaky column absent from Phase 5 — which is what separates a real model from a naive one.

**Round 3 — Draft (5 min).** Pick exactly 1 character believed to survive Phase 5. First team to claim one takes them off the board for everyone else, enforced atomically in Firestore (not just in the page's UI). The pool is built at generation time from characters with real Phase 5 outcomes only — 43 of the 60-character roster — so every pick is guaranteed a real result. This is the only round with genuine time pressure.

**Round 4 — Report (20–30 min).** Auto-filled with their boldest Predict answers; they write 1–2 sentences per prediction citing what backs it, plus at least one trap they caught. A judge scores it by checklist (not vibes) whenever they get to it.

They can close the tab and come back later — team ID is typed once, saved in the browser, everything resumes.

---

## Late arrivals

A 2.5–3 hour runtime doesn't fit inside a 6-hour window for someone who walks in at 4 PM. That's an accepted trade for making this a real event rather than a 20-minute filler. What absorbs it:

- **Explore, Predict and Report are each graded per submission,** the instant it lands. A partial run keeps every point it earned — there is no all-or-nothing completion bonus.
- **The landing page says this up front,** so a late team knows to start anyway rather than deciding it's too late to bother.
- **Draft takes 5 minutes** and is the only round with a hard deadline, so even a very late team can get a pick in.
- At 6 PM, either let teams still working finish before running the reveal, or run it and let their picks score alongside everyone else's.

---

## Scoring (final combined leaderboard)

`Total = 0.5 × Analysis% + 0.2 × Draft% + 0.3 × Report%`

- **Analysis%** = sum of all 34 Brier scores (Explore + Predict together) ÷ 34, each 0–100. Both rounds share one score bucket. A skipped question defaults to the neutral 75 (50% confidence), never scored as 0 — an honest shrug is never worse than a guess.
- **Draft%** = (survived +30, top-third screentime +20, team-up +15) ÷ 65, capped at 100.
- **Report%** = judge's tick-box checklist (Data Sophistication / Logic & Evidence / Visualization / Communication, 25 pts each = 100), averaged across however many judges score it.
- **Tie-break:** higher raw Analysis score, then earlier submission timestamp.

The live projector (`admin.html`) shows rank + total only — never a per-round breakdown — so no team can reverse-engineer another team's raw score by watching the board.

---

## Architecture (why it's free and how grading actually runs)

- **Firestore (free Spark plan)**: database, security rules, and static site hosting. No card needed, no usage cap that forces an upgrade.
- **No Cloud Functions**: they require Firebase's paid Blaze plan even to stay inside the free quota. Instead, `portal/local-server/grading-server.js` runs on the organizer's own laptop for the whole window, doing the same job — grading submissions and judge scores the instant they land, debounced so a burst of activity never approaches Firestore's daily free-tier limits.
- **`portal/local-server/reveal.js`** — a one-shot script run once at the end of the window to score every team's draft pick and post the final Draft numbers.
- **`portal/local-server/seed.js`** — loads the generated questions and answer key into Firestore before the event starts (already done for this deployment).

---

## Organizer day-of checklist

**Before 12:00 PM:**
1. `cd portal/local-server && node grading-server.js` — leave this terminal open for the whole 6 hours. It should print `Loaded 34 questions ... Answer key: present`. If it says `MISSING`, re-run `seed.js`.
2. Project `admin.html` somewhere visible.

**During the window:** nothing to do except keep the grading server running and let people drop in.

**At 6:00 PM (or once the draft pool has had a fair run):**
3. In a second terminal: `cd portal/local-server && node reveal.js` — posts every team's Draft score and the final combined leaderboard.
4. Judging can happen anytime once reports start coming in — no need to wait for 6 PM.

**Setup is already complete** for project `doomsdayalgorithm-5f1e8` (owned by nj58711@gmail.com — the Firebase CLI must be logged in as *that* account). Full details in `RUNBOOK.md`.

---

## Known limitations (accepted, not fixed)

- **Runtime exceeds what a late arrival can finish** — mitigated by per-submission grading, not eliminated. See *Late arrivals*.
- **No automated window enforcement** — Firestore doesn't check the clock. Compensate by treating submissions after you run `reveal.js` as not counting.
- **Draft pool caps at 43 characters**, not your full team count — inherent to a 60-character roster with exclusive picks. Late arrivals may find it thin.
- **Team IDs are self-chosen, not authenticated** — mitigate with organizer check-in at the door.
- **A team with zero submissions scores 0%**, not the neutral 75% a partially-completing team gets (no way to credit a team that never appears in the data at all).
