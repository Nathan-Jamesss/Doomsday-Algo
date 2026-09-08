# Doomsday Algorithm — Redesign Spec

**Date:** 2026-09-08
**Event:** V-TAPP 2026, Doomsday Algorithm — Data Science Club, VIT-AP
**Dates:** 11th–12th September 2026 · **Duration:** 4 hours, one block
**Coordinators:** Nathan James (student), Dr. Yada Nandukumar (faculty)
**Participants:** ~150, individual & team (1–4 per team)
**Status:** Design approved in chat, section by section. Not yet handed to writing-plans.

---

## 1. Why the original plan didn't work

The original `implementation_plan.md` proposed a portal for a competition where teams analyze an MCU dataset (screentime, box office, co-appearances) and predict "possible characters, team-ups, conflicts, or plot developments in Avengers: Doomsday."

Three problems, found during research:

1. **The answer is already public.** *Avengers: Doomsday* releases **December 18, 2026** — three months after this event. Cast (~27 confirmed, including RDJ as Doctor Doom, Pedro Pascal as Mr. Fantastic, Vanessa Kirby as Sue Storm) and story details are already reported. The "prediction" task is a Google search, not an analysis.
2. **Nothing resolves at the event.** A real prediction about the real film can't be scored for three months. No live leaderboard, no winner-by-accuracy, no scoring tension during the 4 hours.
3. **No causal path from data to answer.** Screentime/dialogue/box office in the real MCU has no mechanism connecting it to real-world casting decisions for an unreleased film. Sophisticated teams would notice this and disengage.
4. **AI-proofing gap.** Audience is confirmed as mostly 2nd/3rd-year students who will use AI freely. An LLM already knows the real MCU cold — it can write perfect pandas *and* already knows Endgame's box office, Doomsday's cast, everything. Any task built on real, memorized MCU facts is trivially solved by asking ChatGPT, no data required.
5. **Spec self-contradiction:** poster and proposal page 1 say 4 hours; proposal page 2 says 1.5 hours. Resolved: **4 hours** is correct.
6. **Judging doesn't scale:** original plan has 2 named coordinators grading ~150 participants on an open 0–10 slider rubric. Research (see §8) shows open numeric judging doesn't calibrate across judges even at small scale, and 2 people cannot grade 40–60 submissions in the time available regardless.

Research sources: forecasting-tournament design (Metaculus, ForecastBench, Good Judgment Open — proper scoring rules / Brier score), hackathon judging design (anishathalye/gavel — pairwise comparison over open scoring), data-competition design literature (public/private leaderboard splits, WOMAC), Fantasy Movie League / Fantasy Box Office (draft scarcity mechanics), and Hindcast (grading a forecaster against a truncated past date instead of an unresolved future one).

---

## 2. The fix: Earth-4471 Incursion Archive

Real MCU **shape** (same tables, same kinds of characters, films, phases), fully **counterfactual values**. Framed in-universe: Doctor Doom's incursion fractured the timeline; this is the data recovered from variant Earth-4471, not Earth-616.

Every page carries the banner: **"This is not Earth-616. Anything you remember about the real MCU is wrong here."**

This single move solves both open problems at once:

- **AI-proofing:** an LLM's memorized Marvel knowledge becomes actively wrong. Tony Stark might die in Phase 1 here. Shuri might outrank Thor in screentime. The dataset is the only source of truth in the room — prompting an AI for "who's important in the MCU" produces a confident, detailed, *wrong* answer.
- **Resolvability:** because I generate the data, I control what's hidden and what's revealed. The "future" (Phase 5) can be revealed live, at the event, because it was never a real future — it's data I already wrote.

---

## 3. Dataset spec

**Tables** (~28 films, ~60 characters, ~900 appearance rows — small enough to open directly in Excel):

| File | Rows (approx) | Columns |
|---|---|---|
| `films.csv` | 28 | film name, phase, year, budget, opening weekend, worldwide gross, critic score, audience score |
| `characters.csv` | 60 | name, faction, first film appeared in, powered (y/n) |
| `appearances.csv` | 900 | character, film, screentime minutes, dialogue lines, billing order, survived (y/n) |
| `co_appearances.csv` | — | character A, character B, film, shared scene count |
| `post_credits.csv` | — | film, character teased, which later film paid it off |
| `roster.csv` | 60 | every character who exists in the timeline, including ones with zero appearances yet (fixes survivorship bias — see traps) |

**Truncation:** Phases 1–4 shipped in the download in full. **Phase 5 does not exist in any downloaded file** — it's the hidden holdout, generated but withheld, revealed progressively as rounds resolve.

**Three planted traps** (the actual difficulty ceiling of the event — separates teams who compute from teams who think):

1. **Simpson's paradox** — screentime correlates *negatively* with box office in the pooled data, *positively* within each phase. A naive single `groupby` gets the sign backwards.
2. **Survivorship bias** — `appearances.csv` only contains characters who were actually cast/shown. Base-rate questions ("will a member of faction X survive") need `roster.csv` as the denominator, not `appearances.csv`. Missing this inflates every downstream probability.
3. **Leaky column** — a `final_billing_position` field, only populated after a film is released. Using it as a predictor tops the live/public leaderboard and collapses on reveal — the Kaggle-overfitting lesson delivered as a real, visible scoreboard crash.

**Real, discoverable signal exists** (this isn't a trick with no answer): post-credit teases predict payoffs with a lag; co-appearance graph centrality predicts team-ups; billing-order trend across phases predicts next-film screentime; faction membership predicts conflict pairings. All four are answerable inside 4 hours from the given tables.

**Build method:** a generator script with an explicit causal model underneath (survival hazard by faction/centrality, screentime trend by billing momentum, etc.) so ground truth falls out by construction and is fully reproducible/regenerable if it leaks before the 11th.

**Open item:** dataset generation itself is not yet built — this spec defines its shape and traps, not its literal contents.

---

## 4. Coding environment

**Decision: bring-your-own-tool. No code runs inside the portal.**

- Lab PCs are confirmed pre-installed with Python/Jupyter, Excel, R, SQL client — matching the poster's own advertised toolset (Python · SQL · Excel · R).
- Portal's only jobs: serve the dataset, ask prediction questions, accept answers, show the live leaderboard. It never runs, receives, or grades code.
- AI tool use (ChatGPT, Copilot) is allowed and irrelevant to fairness: an AI can write flawless pandas against `appearances.csv`, but cannot know Shuri's Phase-5 survival odds — that fact doesn't exist anywhere outside this generated dataset.
- This adds zero build scope beyond the portal already being built.

---

## 5. Event structure — 4 hours, one block

| Time | Block | What happens |
|---|---|---|
| 0:00–0:15 | Briefing | Rules, portal walkthrough, dataset download goes live |
| 0:15–0:45 | Round 1 — Explore | Load Phases 1–4, orient in the data. No scoring. Portal shows example charts (screentime bar, co-appearance network, box-office trend) as hints at what's answerable, not answers. |
| 0:45–2:15 | Round 2 — Predict | ~15–20 locked questions about hidden Phase 5. Teams submit probabilities, can revise until the window closes. Live leaderboard updates on submit. |
| 2:15–2:30 | Break | Leaderboard freezes and is projected. |
| 2:30–3:00 | Round 3 — Draft | Live snake draft over a shared character pool, scored against Phase 5 once revealed. |
| 3:00–3:45 | Round 4 — Report | Short written justification for their 3 boldest Round 2 predictions, auto-scaffolded by the portal. |
| 3:45–4:00 | Reveal | Portal locks, combined leaderboard shown live, top teams defend one prediction for 60 seconds. |
| — (side event) | Sealed envelope | One real-world prediction about the actual *Avengers: Doomsday*, sealed digitally, opened December 18, 2026. Zero points at the event — pure narrative payoff / long-tail hook for the club. |

---

## 6. Round 2 — Predict, and the scoring rule

Each yes/no question: team submits probability `p` (0–100%) that the answer is "yes."

**Brier-based scoring**, once Phase 5 is revealed:

- If actual answer is **yes**: penalty = `(1 − p)²`
- If actual answer is **no**: penalty = `p²`
- `points = 100 × (1 − penalty)` → range 0–100 per question.

| Team says | If it happens | If it doesn't |
|---|---|---|
| 50% (no opinion) | 75 pts | 75 pts |
| 90% (confident, right) | 99 pts | 19 pts |
| 90% (confident, wrong) | 19 pts | 99 pts |
| 100% (max confidence, wrong) | 0 pts | 100 pts |

Property that matters: this is a **proper scoring rule** — the only way to maximize expected score is to report true confidence. Bluffing is a losing strategy by the math, not by a rule someone has to enforce. Sitting at 50% forever caps a team at 75/question — safe, but can't win.

**Multi-choice questions** ("who does Character X team up with?"): team splits 100% of confidence across listed options; score uses the same formula against whichever option turns out correct.

**Missing/skipped questions** default to 50% (flat 75 pts) — a blank is never worse than an honest shrug.

---

## 7. Round 3 — Draft (scarcity round)

- **Pool:** 24 curated characters from `roster.csv`.
- **Draft order:** set by Round 2 leaderboard rank (analysis performance earns draft priority — ties the two rounds together).
- **Format:** snake draft, 3 rounds → each team ends with 3 characters.
- **Pace:** 15-second timer per pick, shown on the shared/projector screen. Timeout → auto-pick the team's highest-ranked remaining character.
- **Spectacle:** picked characters disappear from the shared board live on the projector — the loud, watchable round, distinct from Round 2's quiet analysis.

**Scoring**, once Phase 5 is revealed, per drafted character:

- Survived → +30
- Top-third screentime in the film → +20
- Appears in a team-up (2+ co-appearances) → +15

Team score = sum across their 3 characters (max 195). Straight fantasy-sports scoring — no probability math needed here.

**Flagged risk:** at ~40–60 teams × 3 picks × 15 sec, this round runs close to its full 30-minute window even with auto-skip. Revisit pacing once exact team count is known.

---

## 8. Round 4 — Report + judging

**What teams submit:** portal auto-fills a skeleton from their own Round 2 answers — their 3 highest-confidence predictions, pre-populated. Team fills in, per prediction: which chart/number backs it, and which trap (if any) they caught and how they handled it. Half a page total.

**Why checklist judging, not open scoring:** research on hackathon judging (anishathalye/gavel, used at HackMIT and others) found open numeric rubrics fail to calibrate — judge A's 7/10 and judge B's 4/10 aren't comparable, especially when each judge only sees a slice of submissions. Fix used here: keep the original proposal's 4 official categories (Data Sophistication / Logic & Evidence / Visualization / Communication, 25% each) but make every point a **fixed yes/no tick**, not a slider.

**Checklist** (built as `Doomsday_Algorithm_Judging_Checklist.docx`, delivered separately):

| Category | Sub-checks | Points |
|---|---|---|
| Data Sophistication | Combined >1 table (+10) · used a real stat, not a raw number (+10) · method matches the claim (+5) | /25 |
| Logic & Evidence | Each of 3 predictions cites a chart/number (+5 ×3) · caught a planted trap (+10) | /25 |
| Visualization | Chart included (+10) · chart is readable (+10) · chart supports the claim beside it (+5) | /25 |
| Communication | Fits length limit (+5) · a stranger follows it in under a minute (+10) · states confidence AND reasoning together (+10) | /25 |

Total /100, feeds the Report component of the final leaderboard.

**Judging logistics — flagged gap in the original plan:** 2 named coordinators cannot grade 40–60 reports in the ~15-minute window before the 4:00 reveal. Needs **5–8 judges** (recruit senior DS-club members), each working a portal queue, one report at a time, **team name hidden (blind ID only)**, ticking boxes — ~60–90 seconds per report. **Open item:** judge roster not yet assigned; flagged to the faculty coordinator.

---

## 9. Final leaderboard

Each round normalized to /100, then weighted:

| Round | Weight | Rationale |
|---|---|---|
| Predict | 50% | Core skill — reading data, calibrating confidence. |
| Draft | 20% | Real but secondary; the fun/scarcity round. |
| Report | 30% | Human judgment matters, but capped so writing quality alone can't overturn bad analysis — only push a close score over. |

`Final score = 0.5×Predict% + 0.2×Draft% + 0.3×Report%`

**Worked example:**
- Team A: Predict 82, Draft 60, Report 90 → 41 + 12 + 27 = **80**
- Team B: Predict 95, Draft 40, Report 50 → 47.5 + 8 + 15 = **70.5**

Team A wins on a weaker Predict score — the Report bonus is real but bounded, never enough alone to flip a large Predict gap.

**Tie-break, in order:**
1. Higher raw Predict score (the objective, machine-graded component).
2. Earlier final Round 2 submission timestamp.
3. Split the prize.

---

## 10. Portal architecture

**Change from original plan:** original `implementation_plan.md` used `localStorage` (per-browser, no sharing). That no longer works — Round 2's live leaderboard, Round 3's shared draft pool, and Round 4's shared judge queue all require state synced live across ~150 devices simultaneously. Needs a real backend.

**Recommended stack:** Firebase real-time database + a frontend that can stay close to the original vanilla HTML/CSS/JS approach, wired to live data instead of localStorage. Free tier comfortably covers this scale; no server to operate during the event; near-instant cross-device sync. (Supabase is an equally viable substitute — final pick tracked as an open item below, not yet confirmed with the user.)

**Pages:**

1. **Landing** — event info, dataset download, countdown to Round 2 close.
2. **Predict** — the ~15–20 questions, probability inputs, live leaderboard.
3. **Draft** — shared character board, live picks, 15-second timer, projector-friendly view.
4. **Report** — auto-filled justification form (pulls each team's own Round 2 top-3 answers).
5. **Judge queue** — the checklist from §8, live in-browser: blind team ID, tick boxes, auto-advance to next report.
6. **Leaderboard / Admin (projector view)** — combined live score across all three weighted rounds; admin controls to open/close each round's submission window.

**Confirmed infra constraints:** lab has reliable internet; live hosted deployment is viable (not LAN-only, not offline).

---

## 11. Open items (not yet resolved)

- **Dataset generation** — this spec defines shape and traps; the actual generator script and data are not yet built.
- **Backend choice** — Firebase recommended (§10); Supabase is an equally viable substitute; not yet confirmed with the user.
- **Exact team count** — affects Round 3 draft pacing (§7) and Round 4 judge staffing (§8). Both currently sized off the proposal's ~150-participant estimate (~40–60 teams).
- **Judge roster for Round 4** — needs 5–8 people beyond the 2 named coordinators; not yet assigned.
- **Sealed envelope mechanics** — confirmed as a side event (§5), exact submission/reveal flow not yet designed in detail.
- **Portal build** — not started. This spec is the input to an implementation plan (next step, via writing-plans).

---

## 12. What's explicitly preserved from the original plan

- Poster, event name, dates, MCU/Doctor Doom visual theme — unchanged.
- The four official judging categories and their 25%-each weighting — unchanged in name and weight, only the *scoring mechanism* under them changed (tick-based vs. open slider).
- Python/SQL/Excel/R as the participant toolset — unchanged, now explicit that all four run outside the portal.
- Dark-tech visual design direction from the original plan (crimson/green portal theme, glassmorphism) — not revisited in this design pass, assumed to carry forward into the portal build.
