# Doomsday Algorithm — Deployment Runbook

**Zero-cost architecture.** Firebase Cloud Functions require the Blaze (pay-as-you-go) plan even to stay inside the free quota — Google requires a billing card on file regardless of whether anything is ever charged. This project has a hard zero-cost, zero-card constraint, so all grading/reveal logic that would have run as Cloud Functions instead runs as plain Node scripts on the organizer's own laptop during the event (`portal/local-server/`). Firestore itself (database, security rules, Hosting) stays on the free **Spark** plan — no card needed anywhere in this setup.

`portal/functions/` still exists with tested pure-grading logic but is **not deployed** — `firebase.json` no longer references it. Keep it only as reference/tests; the real runtime logic lives in `portal/local-server/`.

---

## One-time setup (before the event)

### 1. Create a Firebase project (Spark plan, free)

At [console.firebase.google.com](https://console.firebase.google.com): create a project, add a Web app, copy the config object into `portal/public/shared/firebaseConfig.js` (replace every `REPLACE_ME`).

### 2. Get a service account key (free, no billing)

Firebase Console → Project Settings → Service Accounts → **Generate new private key**. Save the downloaded JSON as:
```
portal/local-server/serviceAccountKey.json
```
This file is gitignored — never commit it. It's the only credential in this whole setup, and it's what makes "run this script" the actual access control for grading/reveal (no Firebase Auth is used anywhere in this project).

### 3. Install dependencies

```bash
cd portal/local-server && npm install
```

### 4. Decide your seed and team count, then generate the dataset

```bash
cd portal/dataset/generator
python build.py --seed 42 --teams 55 --public-out ../../public/data --private-out ./private
```

- `--seed` is fixed once you're happy with it — re-running with the same seed produces byte-identical output. If `build.py` fails with `AssertionError: Simpson's paradox trap failed`, try a different seed (this is expected tuning, not a bug — verified seeds 1-99 are ~85% likely to pass on the first try; seed 100 is a known failure).
- `--teams` sizes the draft pool. The roster only has 60 characters total, so **the pool caps at however many characters actually got a Phase 5 outcome (typically ~40-44), never at `--teams`** — if more teams register than that, some teams simply won't get a draft pick this round. This is an inherent limit of an exclusive draft over a fixed roster, not a bug.
- `--public-out` must land inside `portal/public/` (the Hosting root) — the frontend's `data/*.csv` and `data/*.json` links are relative to that root.
- `--private-out` must **never** be inside `portal/public/` — anything under there gets served to the public web the moment Hosting is deployed. The default (`./private`, i.e. `portal/dataset/generator/private/`) is safe.

Confirm the trap actually holds and the draft pool is real before moving on:
```bash
cd portal/dataset/generator && python -m unittest discover -p "test_*.py"
```
All tests should pass (27 as of this writing).

### 5. Seed Firestore

```bash
cd portal/local-server
node seed.js --public-dir ../public/data --private-dir ../dataset/generator/private
```

**This path must match Step 4's `--private-out` exactly** (`../dataset/generator/private` from here is the same directory as `./private` from `portal/dataset/generator/`). If you change the seed and re-run Step 4, re-run this step too — seeding from a stale answer key silently grades the whole event against the wrong data, with no error anywhere.

This loads `questions.json` into the `questions` collection (one doc per question, **doc ID equal to the question's own `id` field** — grading depends on this exact match) and `answer_key.json` into `answer_key/phase5`.

### 6. Deploy Firestore rules and Hosting

```bash
firebase deploy --only firestore:rules,hosting
```

No `functions` target — nothing here needs Blaze. If you ever see a prompt asking to upgrade to Blaze, you've pointed the CLI at `portal/functions/`; don't deploy that directory.

### 7. Rehearse end-to-end against the real deployed project

**Do this before the event — file:// and emulator testing hides exactly the bugs a real deploy catches** (this is not hypothetical: several deploy-path and rule bugs in this project were only caught this way). With `node local-server/grading-server.js` running:
1. Open the deployed landing page, download a CSV — confirm it's real data, not a 404.
2. Submit one Predict answer on the deployed Predict page — confirm `leaderboard` (Firebase Console → Firestore) shows a `predictRaw` for that team within a few seconds.
3. Draft one character — confirm it disappears from a second browser/tab.
4. Submit a Round 4 report, then score it once from the Judge Queue page — confirm `reportRaw` appears.
5. Run `node reveal.js` — confirm `draftRaw` appears and the Admin/Leaderboard page shows a ranked table.

If any of these fail, fix it now — you will not have time during the live event.

---

## During the event

**This is a drop-in event, not a synchronized one.** Event window: **12:00 PM – 6:00 PM, September 11, 2026.** Teams arrive and leave whenever within that window, at their own pace — there's no group kickoff and no fixed round boundaries. The only thing with real time pressure is Draft (character pool shrinks as the day goes on); everything else is per-team.

1. **Before 12:00 PM**, start the grading server and leave the terminal window open for the entire window:
   ```bash
   cd portal/local-server && node grading-server.js
   ```
   It prints `Grading server running.` once ready. If it prints `Answer key: MISSING`, re-run Step 5 above — grading will silently do nothing without it. It's designed to sit open for hours without issue (submissions are debounced/batched, not processed one-by-one against Firestore's free quota — see the comments in `grading-server.js` if curious).
2. Project `admin.html` for the live combined leaderboard (rank + total only — no per-round breakdown is shown publicly, by design, so no team can reverse-engineer another team's raw Predict score).
3. **At 6:00 PM (or whenever you decide the draft pool has had a fair run)**, in a **second** terminal (keep `grading-server.js` running):
   ```bash
   cd portal/local-server && node reveal.js
   ```
   This scores every team's draft picks and flips `reveal_state/status.revealed = true`. Draft scores appear on the projector within seconds. This is the one moment that IS synchronized — everyone's Draft score posts at once, because it can't be computed per-team (it depends on the same hidden data for everyone).
4. Judging (Round 4) can happen anytime after reports are submitted — no ordering dependency on the reveal, and no need to wait until 6 PM to start judging.

---

## Known limitations (accepted, not fixed)

- **No automated window enforcement.** Firestore rules don't check the clock — a team can technically submit outside 12 PM–6 PM. Compensate operationally: announce the window clearly, and simply don't run `seed.js`/deploy before 12 PM or accept new submissions as meaningful after you've decided to run `reveal.js`.
- **Draft pool caps at ~40-44 characters, not your full team count** (the roster only has 60 characters total; an exclusive draft can't serve more picks than exist). Plan your expectations accordingly — teams arriving late in the day may find the pool thin or empty, which is expected, not a bug.
- **Team IDs are self-chosen, not authenticated.** A team could type another team's name. Mitigate by having organizers verify/assign team IDs at check-in, same as the original paper-based plan.
- **A team that submits zero Predict answers scores 0% on Predict, not the neutral 75% a team who answers something-but-not-everything gets.** The "skipped question defaults to neutral" rule only applies once a team has at least one submission (so grading has something to attach a score to) — a team that never interacts with Predict at all has no record to credit at all. Low real-world impact (a team doing literally nothing isn't meaningfully participating), but worth knowing if you see a 0% and wonder why.
