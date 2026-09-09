# Doomsday Algorithm — Final Event Plan

**Format:** Drop-in, not synchronized. Students arrive and leave whenever within the window, at their own pace. No group kickoff, no shared clock, no host walking everyone through it together.

**Window:** 12:00 PM – 6:00 PM, September 11, 2026 (fixed by the festival — not extendable).

**Time per team:** ~15–20 minutes, start to finish. Someone arriving at 5:30 PM still has plenty of runway.

**Cost:** $0. No credit card anywhere in this setup (Firebase Spark plan + a local script instead of paid Cloud Functions).

---

## What a participant actually does

1. **Land on the site** (`index.html`) — the page itself is the entire briefing, since there's no live host. States the window, the steps, the timing, and that Draft is the one part with real urgency.
2. **Download the dataset** (6 CSVs: films, characters, appearances, co_appearances, post_credits, roster) — Excel, Python, SQL, or R, whatever they've got. Real MCU *shape*, fabricated *facts* — the "Earth-4471" banner on every page warns them not to trust memory.
3. **Predict** — 12 questions about hidden "Phase 5" data (5 survival yes/no, 3 team-up yes/no, 2 "who's their closest partner" multichoice, 2 screentime-comparison yes/no). Each answer is a probability (0–100%), not a guess — a proper scoring rule (Brier score) means bluffing is a losing strategy, not just bad form. Graded the instant they submit, per question, no waiting.
4. **Draft** — pick exactly 1 character. Whoever picks first gets it; it's gone for everyone else immediately. Pool is generated at build time from real Phase-5 outcomes only (~40-44 characters, not the full 60-character roster), so every character in the pool is guaranteed to have a real result once revealed. Enforced atomically server-side (Firestore), not just by the page's own UI.
5. **Report** — auto-filled with their 3 boldest Predict answers; they write 1–2 sentences per prediction citing what backs it. A judge scores it later (checklist, not vibes — see below) whenever they get to it.
6. **Leave.** Predict and Report scores are final the moment they're graded. Draft score posts for everyone at once, later, once the organizer closes the draft pool and runs the reveal — that's the one thing that genuinely can't be scored per-team, since it depends on data nobody sees until then.

They can close the tab and come back later — team ID is typed once, saved in the browser, and everything picks up where they left off.

---

## Scoring (final combined leaderboard)

`Total = 0.5 × Predict% + 0.2 × Draft% + 0.3 × Report%`

- **Predict%** = sum of 12 Brier scores ÷ 12, each 0–100. A skipped question defaults to the neutral 75 (50% confidence), never scored as 0 — an honest shrug is never worse than a guess.
- **Draft%** = (survived +30, top-third screentime +20, team-up +15) ÷ 65, capped at 100.
- **Report%** = judge's tick-box checklist (Data Sophistication / Logic & Evidence / Visualization / Communication, 25 pts each = 100), averaged across however many judges score it.
- **Tie-break:** higher raw Predict score, then earlier submission timestamp.

The live projector (`admin.html`) shows rank + total only — never a per-round breakdown — so no team can reverse-engineer another team's raw Predict score by watching the board.

---

## Architecture (why it's free and how grading actually runs)

- **Firestore (free Spark plan)**: the database, security rules, and static site hosting. No card needed, no usage cap that forces an upgrade.
- **No Cloud Functions**: they require Firebase's paid Blaze plan even to stay inside the free quota. Instead, `portal/local-server/grading-server.js` runs on the organizer's own laptop for the whole window, doing the same job — grading Predict submissions and judge scores the instant they land, debounced so a burst of activity never approaches Firestore's daily free-tier limits.
- **`portal/local-server/reveal.js`** — a one-shot script the organizer runs once, at the end of the window, to score every team's draft pick and post the final Draft numbers.
- **`portal/local-server/seed.js`** — loads the generated questions and answer key into Firestore before the event starts.

---

## Organizer day-of checklist

**Before 12:00 PM:**
1. `cd portal/local-server && node grading-server.js` — leave this terminal open for the whole 6 hours.
2. Project `admin.html` somewhere visible.

**During the window:** nothing to do except keep the grading server running and let people drop in.

**At 6:00 PM (or once the draft pool has had a fair run):**
3. In a second terminal: `cd portal/local-server && node reveal.js` — posts every team's Draft score and the final combined leaderboard.
4. Judging can happen anytime once reports start coming in — no need to wait for 6 PM.

**Full setup instructions:** see `RUNBOOK.md` in the repo root — covers creating the free Firebase project, generating the dataset, seeding Firestore, and deploying. **Do the real end-to-end rehearsal (RUNBOOK step 7) against your actual deployed project before the event** — three separate rounds of review this session each found bugs that were only visible on a real deploy, invisible under any local testing.

---

## Known limitations (accepted, not fixed)

- No automated window enforcement — Firestore doesn't check the clock. Compensate by not seeding/deploying before 12 PM and treating submissions after you run `reveal.js` as not counting.
- Draft pool caps at ~40-44 characters, not your full team count — inherent to a 60-character roster with exclusive picks. Late arrivals may find it thin.
- Team IDs are self-chosen, not authenticated — mitigate with organizer check-in, same as the original paper-based plan.
- A team with zero Predict submissions scores 0%, not the neutral 75% a partially-completing team gets (no way to credit a team that never showed up in the data at all).
