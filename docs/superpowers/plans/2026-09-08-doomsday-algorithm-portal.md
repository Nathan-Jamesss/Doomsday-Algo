# Doomsday Algorithm Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Earth-4471 dataset generator, the scoring engine, the Firebase backend, and the six-page live event portal for the Doomsday Algorithm competition.

**Architecture:** A Python generator produces a counterfactual MCU dataset (Phases 1–4 shipped, Phase 5 hidden) with three planted analytical traps. Pure, unit-tested JS functions implement Brier scoring, draft scoring, and leaderboard combination — these are called both client-side (for instant feedback) and inside thin Firebase Cloud Function wrappers (for the authoritative, tamper-proof score). The frontend is six static HTML/CSS/vanilla-JS pages wired to Firestore for live cross-device sync, styled with the dark-tech red/green portal theme from the original poster.

**Tech Stack:** Python 3 (stdlib only) for the generator, vanilla JS + `node:test` for scoring logic, Firebase (Firestore + Cloud Functions + Hosting), HTML/CSS (no frontend framework — matches original plan's vanilla approach).

**Spec:** `c:\Users\natha\Desktop\Organization\DSC\DOOMSDAY\doomsday_algorithm_redesign_spec.md`

## Global Constraints

- Real character names, fully counterfactual facts — every generated fact must differ from real MCU canon (spec §2).
- Dataset ships Phases 1–4 only; Phase 5 rows never appear in any downloadable file (spec §3).
- Three traps are mandatory and must be independently verifiable by test: Simpson's paradox (pooled screentime-vs-boxoffice correlation negative, within-phase positive), survivorship bias (`roster.csv` has more characters than `appearances.csv`), leaky column (`final_billing_position` populated for Phases 1–4, structurally unavailable for Phase 5) (spec §3).
- Brier scoring: `points = 100 × (1 − penalty)`, penalty `(1-p)²` if yes, `p²` if no (spec §6). Confidence must be rewarded/punished per the spec's worked table (50%→75, 90% right→99, 90% wrong→19, 100% wrong→0).
- Draft scoring per character: survived +30, top-third screentime +20, team-up (2+ co-appearances) +15, max 195/team (spec §7).
- Final leaderboard: `0.5×Predict% + 0.2×Draft% + 0.3×Report%`, tie-break by raw Predict score then earliest Round 2 timestamp (spec §9).
- No code execution happens inside the portal — it only serves data, takes answers, shows scores (spec §4).
- Answer key (Phase 5 data) must never be readable by an unauthenticated Firestore client read before the reveal — grading happens via Cloud Function, not client-side against exposed data (spec §10, security gap not explicit in spec but required by §1's "AI-proofing"/integrity intent).
- Judge checklist categories and point values must match `Doomsday_Algorithm_Judging_Checklist.docx` exactly: Data Sophistication /25, Logic & Evidence /25, Visualization /25, Communication /25 (spec §8).
- Visual theme carries forward from the original plan: background `#0c0f12`, crimson accent `#e23636`→`#ff6b6b`, green accent `#2ecc71`→`#58d68d`, glassmorphism panels (spec §12).

---

## Phase 1 — Dataset Generator

### Task 1: Causal model + core entity generation (films, characters, roster)

**Files:**
- Create: `portal/dataset/generator/model.py`
- Create: `portal/dataset/generator/entities.py`
- Test: `portal/dataset/generator/test_entities.py`

**Interfaces:**
- Produces: `generate_films(seed: int) -> list[dict]` — each dict has keys `name, phase, year, budget_m, opening_weekend_m, worldwide_gross_m, critic_score, audience_score`.
- Produces: `generate_characters(seed: int) -> list[dict]` — each dict has keys `name, faction, first_film, powered, centrality, future_debut` (centrality is a hidden 0–1 float used later, not shipped to participants; `future_debut` is `True` for a fixed, deterministic subset of 10 characters reserved to never appear in Phases 1–4 — this is what makes the survivorship-bias trap structural rather than probabilistic, since a cast size of 10 drawn from up to 60 characters across 28 films would otherwise cover nearly all 60 by chance).
- Produces: `ROSTER_SIZE = 60`, `FILMS_PER_PHASE = 7`, `PHASE_COUNT = 4`, `FUTURE_DEBUT_COUNT = 10` (Phases 1–4 only; Phase 5 handled in Task 3).

- [ ] **Step 1: Write the failing test for character/film generation shape**

```python
# portal/dataset/generator/test_entities.py
import unittest
from entities import generate_films, generate_characters, ROSTER_SIZE, FILMS_PER_PHASE, PHASE_COUNT

class TestEntityGeneration(unittest.TestCase):
    def test_generates_28_films_across_4_phases(self):
        films = generate_films(seed=42)
        self.assertEqual(len(films), FILMS_PER_PHASE * PHASE_COUNT)
        phases = sorted(set(f["phase"] for f in films))
        self.assertEqual(phases, [1, 2, 3, 4])

    def test_generates_60_characters_with_required_fields(self):
        chars = generate_characters(seed=42)
        self.assertEqual(len(chars), ROSTER_SIZE)
        for c in chars:
            self.assertIn(c["faction"], {"Avengers", "X-Men", "Cosmic", "Villains", "Other"})
            self.assertTrue(0.0 <= c["centrality"] <= 1.0)
            self.assertIn(c["powered"], (True, False))
            self.assertIn(c["future_debut"], (True, False))

    def test_exactly_ten_characters_are_reserved_for_future_debut(self):
        from entities import FUTURE_DEBUT_COUNT
        chars = generate_characters(seed=42)
        reserved = [c for c in chars if c["future_debut"]]
        self.assertEqual(len(reserved), FUTURE_DEBUT_COUNT)

    def test_generation_is_deterministic_for_same_seed(self):
        self.assertEqual(generate_films(seed=7), generate_films(seed=7))
        self.assertEqual(generate_characters(seed=7), generate_characters(seed=7))

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd portal/dataset/generator && python -m unittest test_entities -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'entities'`

- [ ] **Step 3: Write minimal implementation**

```python
# portal/dataset/generator/model.py
"""Real MCU shape, counterfactual values. Character names are real; every
fact attached to them (survival, screentime, billing, box office) is
fabricated by this module for the Earth-4471 variant timeline."""
import random

FACTIONS = ["Avengers", "X-Men", "Cosmic", "Villains", "Other"]

REAL_CHARACTER_NAMES = [
    "Tony Stark", "Steve Rogers", "Natasha Romanoff", "Thor Odinson", "Bruce Banner",
    "Clint Barton", "Wanda Maximoff", "Vision", "Sam Wilson", "Bucky Barnes",
    "Peter Parker", "Stephen Strange", "T'Challa", "Shuri", "Carol Danvers",
    "Scott Lang", "Hope van Dyne", "Peter Quill", "Gamora", "Drax",
    "Rocket", "Groot", "Mantis", "Nebula", "Loki",
    "Wanda's Children", "Kate Bishop", "Yelena Belova", "America Chavez", "Riri Williams",
    "Charles Xavier", "Jean Grey", "Scott Summers", "Ororo Munroe", "Logan",
    "Kurt Wagner", "Kitty Pryde", "Bobby Drake", "Warren Worthington", "Piotr Rasputin",
    "Victor von Doom", "Thanos", "Ultron", "Killmonger", "Hela",
    "Kang", "Mysterio", "Vulture", "Red Skull", "Ronan",
    "Nick Fury", "Maria Hill", "Everett Ross", "Happy Hogan", "Pepper Potts",
    "Wong", "Valkyrie", "Korg", "Okoye", "M'Baku",
]

def build_rng(seed):
    return random.Random(seed)
```

```python
# portal/dataset/generator/entities.py
from model import build_rng, FACTIONS, REAL_CHARACTER_NAMES

ROSTER_SIZE = 60
FILMS_PER_PHASE = 7
PHASE_COUNT = 4
FUTURE_DEBUT_COUNT = 10

FILM_TITLES = [f"Earth-4471 Chronicle {i+1}" for i in range(FILMS_PER_PHASE * PHASE_COUNT)]

def generate_films(seed):
    rng = build_rng(seed)
    films = []
    idx = 0
    for phase in range(1, PHASE_COUNT + 1):
        # Simpson's paradox setup: avg screentime allocation shrinks per phase
        # (bigger ensembles), box office baseline grows per phase (franchise
        # hype) — pooled correlation goes negative, within-phase stays positive.
        phase_screentime_budget = 90 - 15 * (phase - 1)
        box_office_base = 400 + 250 * (phase - 1)
        for _ in range(FILMS_PER_PHASE):
            year = 2018 + phase
            budget = round(150 + rng.uniform(-20, 40), 1)
            deviation = rng.uniform(-15, 15)  # per-film screentime deviation from phase avg
            gross = round(box_office_base + 1.8 * deviation + rng.uniform(-30, 30), 1)
            films.append({
                "name": FILM_TITLES[idx],
                "phase": phase,
                "year": year,
                "budget_m": budget,
                "opening_weekend_m": round(gross * 0.38, 1),
                "worldwide_gross_m": gross,
                "critic_score": rng.randint(45, 95),
                "audience_score": rng.randint(45, 95),
                "_phase_screentime_budget": phase_screentime_budget,
                "_screentime_deviation": deviation,
            })
            idx += 1
    return films

def generate_characters(seed):
    rng = build_rng(seed)
    names = list(REAL_CHARACTER_NAMES[:ROSTER_SIZE])
    reserved = set(rng.sample(names, FUTURE_DEBUT_COUNT))
    chars = []
    for name in names:
        faction = rng.choice(FACTIONS)
        chars.append({
            "name": name,
            "faction": faction,
            "first_film": None,  # filled in Task 2 once appearances are generated
            "powered": rng.random() > 0.35,
            "centrality": round(rng.random(), 3),
            "future_debut": name in reserved,
        })
    return chars
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd portal/dataset/generator && python -m unittest test_entities -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add portal/dataset/generator/model.py portal/dataset/generator/entities.py portal/dataset/generator/test_entities.py
git commit -m "feat: dataset generator core entities (films, characters)"
```

---

### Task 2: Appearances, co-appearances, post-credits (Phases 1–4)

**Files:**
- Create: `portal/dataset/generator/appearances.py`
- Test: `portal/dataset/generator/test_appearances.py`

**Interfaces:**
- Consumes: `generate_films(seed)`, `generate_characters(seed)` from Task 1.
- Produces: `generate_appearances(films, characters, seed) -> list[dict]` — keys `character, film, screentime_min, dialogue_lines, billing_order, final_billing_position, survived`.
- Produces: `generate_co_appearances(appearances, seed) -> list[dict]` — keys `character_a, character_b, film, shared_scenes`.
- Produces: `generate_post_credits(films, appearances, seed) -> list[dict]` — keys `film, character_teased, paid_off_in_film`. Takes `appearances` (not `characters`) so `character_teased` is always drawn from the real cast of `paid_off_in_film` — a tease that no one in that film's cast can pay off would be a lie the data can never make good on.

- [ ] **Step 1: Write the failing test**

```python
# portal/dataset/generator/test_appearances.py
import unittest
from entities import generate_films, generate_characters
from appearances import generate_appearances, generate_co_appearances, generate_post_credits

class TestAppearances(unittest.TestCase):
    def setUp(self):
        self.films = generate_films(seed=42)
        self.characters = generate_characters(seed=42)

    def test_appearances_have_required_fields(self):
        apps = generate_appearances(self.films, self.characters, seed=42)
        self.assertGreater(len(apps), 0)
        for a in apps[:5]:
            for key in ("character", "film", "screentime_min", "dialogue_lines",
                        "billing_order", "final_billing_position", "survived"):
                self.assertIn(key, a)

    def test_future_debut_characters_never_appear_in_phases_1_to_4(self):
        apps = generate_appearances(self.films, self.characters, seed=42)
        appeared_names = {a["character"] for a in apps}
        reserved_names = {c["name"] for c in self.characters if c["future_debut"]}
        self.assertEqual(appeared_names & reserved_names, set())

    def test_dead_characters_do_not_reappear_in_later_films(self):
        apps = generate_appearances(self.films, self.characters, seed=42)
        film_order = {f["name"]: i for i, f in enumerate(self.films)}
        apps_sorted = sorted(apps, key=lambda a: film_order[a["film"]])
        dead = set()
        for a in apps_sorted:
            self.assertNotIn(a["character"], dead,
                f"{a['character']} appears in {a['film']} after already being marked dead")
            if not a["survived"]:
                dead.add(a["character"])

    def test_co_appearances_only_reference_shared_films(self):
        apps = generate_appearances(self.films, self.characters, seed=42)
        co = generate_co_appearances(apps, seed=42)
        cast_by_film = {}
        for a in apps:
            cast_by_film.setdefault(a["film"], set()).add(a["character"])
        for row in co:
            self.assertIn(row["character_a"], cast_by_film[row["film"]])
            self.assertIn(row["character_b"], cast_by_film[row["film"]])

    def test_post_credits_reference_real_films(self):
        apps = generate_appearances(self.films, self.characters, seed=42)
        film_names = {f["name"] for f in self.films}
        pc = generate_post_credits(self.films, apps, seed=42)
        cast_by_film = {}
        for a in apps:
            cast_by_film.setdefault(a["film"], set()).add(a["character"])
        for row in pc:
            self.assertIn(row["film"], film_names)
            self.assertIn(row["paid_off_in_film"], film_names)
            # the teased character must actually be cast in the film that
            # pays it off — otherwise the tease is a lie the data itself
            # can never make good on
            self.assertIn(row["character_teased"], cast_by_film[row["paid_off_in_film"]])

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd portal/dataset/generator && python -m unittest test_appearances -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'appearances'`

- [ ] **Step 3: Write minimal implementation**

```python
# portal/dataset/generator/appearances.py
import re
from model import build_rng

CAST_SIZE_PER_FILM = 10

def _chronological_key(film):
    # Film names are "Earth-4471 Chronicle {N}" — sorting by (phase, name)
    # string-sorts "Chronicle 10" before "Chronicle 8" within a phase,
    # scrambling release order and letting characters who die in a later-
    # processed-but-earlier-released film "come back to life" in an
    # earlier-processed-but-later-released one. Sort by the numeric suffix
    # instead so processing order matches true chronological order.
    match = re.search(r'(\d+)$', film["name"])
    return (film["phase"], int(match.group(1)) if match else 0)

def generate_appearances(films, characters, seed):
    rng = build_rng(seed)
    alive = {c["name"]: True for c in characters}

    appearances = []
    films_sorted = sorted(films, key=_chronological_key)
    for film in films_sorted:
        # future_debut characters are structurally reserved out of Phases 1-4
        # casting — this is what guarantees the survivorship-bias trap holds,
        # rather than leaving it to chance whether every character gets cast
        # at least once across 28 films.
        pool = [c for c in characters if alive[c["name"]] and not c["future_debut"]]
        rng.shuffle(pool)
        cast = pool[:CAST_SIZE_PER_FILM]
        # billing order by centrality (higher centrality = better billing = lower number)
        cast_sorted = sorted(cast, key=lambda c: -c["centrality"])
        for order, c in enumerate(cast_sorted, start=1):
            base_screentime = film["_phase_screentime_budget"] * (c["centrality"] + 0.2)
            screentime = round(max(1.0, base_screentime + rng.uniform(-5, 5)), 1)
            dialogue = int(max(0, screentime * rng.uniform(2.0, 4.0)))
            # survival hazard: higher centrality = plot armor, lower hazard
            hazard = 0.12 * (1 - c["centrality"])
            survived = rng.random() > hazard
            if not survived:
                alive[c["name"]] = False
            appearances.append({
                "character": c["name"],
                "film": film["name"],
                "screentime_min": screentime,
                "dialogue_lines": dialogue,
                "billing_order": order,
                # leaky column: only ever knowable once a film has released —
                # correlates strongly with survival in hindsight, but Phase 5
                # rows (generated in Task 3) never get this field populated,
                # because Phase 5 hasn't "released" in the fiction yet.
                "final_billing_position": order if rng.random() > 0.15 else order + rng.choice([-1, 1]),
                "survived": survived,
            })
    return appearances

def generate_co_appearances(appearances, seed):
    rng = build_rng(seed)
    by_film = {}
    for a in appearances:
        by_film.setdefault(a["film"], []).append(a["character"])
    rows = []
    for film, cast in by_film.items():
        for i in range(len(cast)):
            for j in range(i + 1, len(cast)):
                if rng.random() > 0.4:  # not every pair shares a scene
                    rows.append({
                        "character_a": cast[i],
                        "character_b": cast[j],
                        "film": film,
                        "shared_scenes": rng.randint(1, 6),
                    })
    return rows

def generate_post_credits(films, appearances, seed):
    rng = build_rng(seed)
    films_sorted = sorted(films, key=_chronological_key)
    cast_by_film = {}
    for a in appearances:
        cast_by_film.setdefault(a["film"], []).append(a["character"])

    rows = []
    for i, film in enumerate(films_sorted[:-1]):
        later_films = films_sorted[i + 1:i + 4] or films_sorted[i + 1:]
        # Only a film whose cast is known can be a truthful payoff — the
        # teased character must actually appear in it, so we pick both
        # from that film's real cast, never from the full roster.
        candidates = [f for f in later_films if cast_by_film.get(f["name"])]
        if not candidates:
            continue
        payoff_film = rng.choice(candidates)
        teased = rng.choice(cast_by_film[payoff_film["name"]])
        rows.append({
            "film": film["name"],
            "character_teased": teased,
            "paid_off_in_film": payoff_film["name"],
        })
    return rows
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd portal/dataset/generator && python -m unittest test_appearances -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add portal/dataset/generator/appearances.py portal/dataset/generator/test_appearances.py
git commit -m "feat: generate appearances, co-appearances, post-credits for Phases 1-4"
```

---

### Task 3: Phase 5 hidden holdout + the three planted traps

**Files:**
- Create: `portal/dataset/generator/phase5.py`
- Create: `portal/dataset/generator/traps.py`
- Test: `portal/dataset/generator/test_traps.py`

**Interfaces:**
- Consumes: `generate_films`, `generate_characters`, `generate_appearances` from Tasks 1–2.
- Produces: `generate_phase5(characters, seed) -> dict` with keys `films` (7 hidden films, no `final_billing_position` field on any row), `appearances`, `co_appearances`, and `characterOutcomes` — a `{character_name: {survived, topThirdScreentime, hadTeamUp}}` map derived from the same `appearances`/`co_appearances` data, one entry per character who appears anywhere in Phase 5. This is the answer key — never written to the participant-facing CSV bundle (enforced in Task 4). `characterOutcomes` is consumed directly by Task 9's `revealPhase5` Cloud Function for draft scoring — its three fields must match `draftCharacterScore`'s `outcome` parameter shape from Task 6 exactly.
- Produces: `verify_simpsons_paradox(films) -> bool`, `verify_survivorship_gap(characters, appearances) -> bool`, `verify_leaky_column(appearances, phase5_appearances) -> bool` — used both by tests here and as a build-time gate in Task 4's CLI. `verify_leaky_column` checks both directions of its own claim: the field is present on every Phase 1-4 row, AND absent from every Phase 5 row — checking only the first direction would let a Phase-5 leak slip past the gate undetected.

- [ ] **Step 1: Write the failing test**

```python
# portal/dataset/generator/test_traps.py
import unittest
from entities import generate_films, generate_characters
from appearances import generate_appearances
from phase5 import generate_phase5
from traps import verify_simpsons_paradox, verify_survivorship_gap, verify_leaky_column

class TestTraps(unittest.TestCase):
    def setUp(self):
        self.films = generate_films(seed=42)
        self.characters = generate_characters(seed=42)
        self.appearances = generate_appearances(self.films, self.characters, seed=42)

    def test_simpsons_paradox_present(self):
        self.assertTrue(verify_simpsons_paradox(self.films))

    def test_survivorship_gap_present(self):
        self.assertTrue(verify_survivorship_gap(self.characters, self.appearances))

    def test_leaky_column_present_in_history_absent_in_future(self):
        phase5 = generate_phase5(self.characters, seed=42)
        self.assertTrue(verify_leaky_column(self.appearances, phase5["appearances"]))

    def test_phase5_has_7_films_and_is_deterministic(self):
        p5a = generate_phase5(self.characters, seed=99)
        p5b = generate_phase5(self.characters, seed=99)
        self.assertEqual(len(p5a["films"]), 7)
        self.assertEqual(p5a, p5b)

    def test_character_outcomes_shape_matches_draft_scoring_contract(self):
        p5 = generate_phase5(self.characters, seed=42)
        appeared = {a["character"] for a in p5["appearances"]}
        self.assertEqual(set(p5["characterOutcomes"].keys()), appeared)
        for outcome in p5["characterOutcomes"].values():
            self.assertIn("survived", outcome)
            self.assertIn("topThirdScreentime", outcome)
            self.assertIn("hadTeamUp", outcome)

    def test_phase5_characters_do_not_reappear_after_death(self):
        # A character sampled independently per film with no cross-film
        # death tracking could die in one Phase 5 film and be cast normally
        # in a later one, producing a contradictory characterOutcomes entry
        # (whichever appearance is processed last silently wins). This test
        # asserts death is permanent across Phase 5's own films, the same
        # property Task 2 already enforces across Phases 1-4.
        p5 = generate_phase5(self.characters, seed=42)
        film_order = {f["name"]: i for i, f in enumerate(p5["films"])}
        apps_sorted = sorted(p5["appearances"], key=lambda a: film_order[a["film"]])
        dead = set()
        for a in apps_sorted:
            self.assertNotIn(a["character"], dead,
                f"{a['character']} appears in {a['film']} after already being marked dead")
            if not a["survived"]:
                dead.add(a["character"])

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd portal/dataset/generator && python -m unittest test_traps -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'phase5'`

- [ ] **Step 3: Write minimal implementation**

```python
# portal/dataset/generator/traps.py
import statistics

def verify_simpsons_paradox(films):
    pooled_screentime = [f["_phase_screentime_budget"] + f["_screentime_deviation"] for f in films]
    pooled_gross = [f["worldwide_gross_m"] for f in films]
    pooled_corr = statistics.correlation(pooled_screentime, pooled_gross)

    within_phase_positive = True
    by_phase = {}
    for f in films:
        by_phase.setdefault(f["phase"], []).append(f)
    for phase_films in by_phase.values():
        st = [f["_screentime_deviation"] for f in phase_films]
        go = [f["worldwide_gross_m"] for f in phase_films]
        if len(set(st)) < 2:
            continue
        if statistics.correlation(st, go) <= 0:
            within_phase_positive = False

    return pooled_corr < 0 and within_phase_positive

def verify_survivorship_gap(characters, appearances):
    appeared_names = {a["character"] for a in appearances}
    roster_names = {c["name"] for c in characters}
    return len(roster_names) > len(appeared_names)

def verify_leaky_column(appearances, phase5_appearances):
    present_in_history = all("final_billing_position" in a for a in appearances) and len(appearances) > 0
    absent_in_future = all("final_billing_position" not in a for a in phase5_appearances)
    return present_in_history and absent_in_future
```

```python
# portal/dataset/generator/phase5.py
from model import build_rng
from appearances import CAST_SIZE_PER_FILM

PHASE5_FILM_COUNT = 7

def generate_phase5(characters, seed):
    rng = build_rng(seed + 5000)
    films = []
    for i in range(PHASE5_FILM_COUNT):
        films.append({
            "name": f"Earth-4471 Chronicle {28 + i + 1}",
            "phase": 5,
            "year": 2023,
            "budget_m": round(200 + rng.uniform(-20, 60), 1),
            "opening_weekend_m": None,   # unreleased in-fiction — not knowable
            "worldwide_gross_m": None,
            "critic_score": None,
            "audience_score": None,
        })

    # Alive-state tracking across Phase 5's own 7 films, mirroring Task 2's
    # generate_appearances exactly — without this, a character sampled
    # independently per film can die in an earlier Phase 5 film and be cast
    # normally (possibly "surviving") in a later one, producing two
    # contradictory outcomes for the same character in characterOutcomes.
    # Phase 5's films list is already in strict chronological order (built
    # by a single sequential range loop above, no re-sort needed).
    alive = {c["name"]: True for c in characters}
    appearances = []
    for film in films:
        pool = [c for c in characters if alive[c["name"]]]
        rng.shuffle(pool)
        cast = pool[:min(CAST_SIZE_PER_FILM, len(pool))]
        cast_sorted = sorted(cast, key=lambda c: -c["centrality"])
        for order, c in enumerate(cast_sorted, start=1):
            base_screentime = 30 * (c["centrality"] + 0.2)
            screentime = round(max(1.0, base_screentime + rng.uniform(-5, 5)), 1)
            hazard = 0.12 * (1 - c["centrality"])
            survived = rng.random() > hazard
            if not survived:
                alive[c["name"]] = False
            appearances.append({
                "character": c["name"],
                "film": film["name"],
                "screentime_min": screentime,
                "dialogue_lines": int(max(0, screentime * rng.uniform(2.0, 4.0))),
                "billing_order": order,
                "survived": survived,
                # deliberately no "final_billing_position" — cannot exist
                # for a film that hasn't released in the fiction yet.
            })

    co_appearances = []
    by_film = {}
    for a in appearances:
        by_film.setdefault(a["film"], []).append(a["character"])
    for film, cast in by_film.items():
        for i in range(len(cast)):
            for j in range(i + 1, len(cast)):
                if rng.random() > 0.4:
                    co_appearances.append({
                        "character_a": cast[i], "character_b": cast[j],
                        "film": film, "shared_scenes": rng.randint(1, 6),
                    })

    # Build the per-character outcome map that Task 9's revealPhase5 Cloud
    # Function feeds directly into Task 6's draftCharacterScore.
    screentime_by_film = {}
    for a in appearances:
        screentime_by_film.setdefault(a["film"], []).append((a["character"], a["screentime_min"]))
    top_third_characters = set()
    for film, entries in screentime_by_film.items():
        entries_sorted = sorted(entries, key=lambda e: -e[1])
        cutoff = max(1, len(entries_sorted) // 3)
        top_third_characters.update(name for name, _ in entries_sorted[:cutoff])

    teamed_up_characters = set()
    for row in co_appearances:
        teamed_up_characters.add(row["character_a"])
        teamed_up_characters.add(row["character_b"])

    # Safe to overwrite on each pass now that death is permanent above: a
    # character with survived=False in one film is excluded from every
    # later film's pool, so their last (and only ever "final") appearance
    # is always the correct source of truth for their outcome.
    character_outcomes = {}
    for a in appearances:
        name = a["character"]
        character_outcomes[name] = {
            "survived": a["survived"],
            "topThirdScreentime": name in top_third_characters,
            "hadTeamUp": name in teamed_up_characters,
        }

    return {
        "films": films,
        "appearances": appearances,
        "co_appearances": co_appearances,
        "characterOutcomes": character_outcomes,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd portal/dataset/generator && python -m unittest test_traps -v`
Expected: PASS (6 tests). If `test_simpsons_paradox_present` fails, adjust the coefficients in `entities.py`'s `generate_films` (the `1.8` multiplier and phase step sizes) until both directions hold — this is expected tuning, not a design change.

- [ ] **Step 5: Commit**

```bash
git add portal/dataset/generator/phase5.py portal/dataset/generator/traps.py portal/dataset/generator/test_traps.py
git commit -m "feat: generate hidden Phase 5 holdout and verify the three planted traps"
```

---

### Task 4: Round 2 question generation + CLI to emit the participant bundle and private answer key

**Why this task grew:** the original draft of this task only wired together Tasks 1–3's raw data. But nothing anywhere in this plan actually defines the ~15–20 concrete Round 2 prediction questions the spec requires (spec §6: "~15–20 locked questions about hidden Phase 5"), nor resolves them into the per-question format Task 8's grading Cloud Function expects to read (`answerKey[question.id].actualYes` / `.correctOption`). That gap was caught by the Task 4 implementer's own self-review, not invented after the fact — this is a real missing deliverable, not scope creep. `build.py` is the natural owner: it already assembles the answer key from the same raw Phase 5 data these questions resolve against.

**Files:**
- Create: `portal/dataset/generator/questions.py`
- Create: `portal/dataset/generator/build.py`
- Test: `portal/dataset/generator/test_questions.py`
- Test: `portal/dataset/generator/test_build.py`

**Interfaces:**
- Consumes: everything from Tasks 1–3, specifically `phase5["characterOutcomes"]`, `phase5["co_appearances"]`, and `phase5["appearances"]`.
- Produces: `generate_questions_and_answers(phase5, seed) -> (questions: list[dict], answers: dict)`. Each question dict has `id, type ("yesno"|"multichoice"), text`, plus `options: list[str]` for multichoice. `answers` is `{questionId: {"actualYes": bool}}` for yesno or `{questionId: {"correctOption": str}}` for multichoice — this exact shape is what Task 8's `computeSubmissionScore` reads directly via `answerKey[question.id]`. Generates 4 question types across 18 total questions: 8 survival yes/no (from `characterOutcomes[name]["survived"]`), 4 team-up yes/no (from `characterOutcomes[name]["hadTeamUp"]`), 3 "who shares the most scenes with X" multichoice (from `co_appearances` shared-scene counts), 3 screentime-comparison yes/no (from summed `appearances` screentime per character). All deterministic per seed.
- Produces: `build_dataset(seed, output_dir)` — writes `films.csv, characters.csv, appearances.csv, co_appearances.csv, post_credits.csv, roster.csv` (Phases 1–4 only) and `questions.json` (question text/type/options — **no answers**) to `output_dir/public/`, and `answer_key.json` (Phase 5 films/appearances/co_appearances/characterOutcomes, flat-merged with each question's resolved answer under its own `questionId` key) to `output_dir/private/`.
- Produces: CLI entry point `python build.py --seed 42 --out ./output`.

- [ ] **Step 1: Write the failing test for question generation**

```python
# portal/dataset/generator/test_questions.py
import unittest
from entities import generate_films, generate_characters
from appearances import generate_appearances
from phase5 import generate_phase5
from questions import generate_questions_and_answers

class TestQuestions(unittest.TestCase):
    def setUp(self):
        films = generate_films(seed=42)
        characters = generate_characters(seed=42)
        generate_appearances(films, characters, seed=42)  # not used directly; phase5 is self-contained
        self.phase5 = generate_phase5(characters, seed=42)

    def test_generates_at_least_15_questions_each_with_an_answer(self):
        questions, answers = generate_questions_and_answers(self.phase5, seed=42)
        self.assertGreaterEqual(len(questions), 15)
        self.assertEqual(len(questions), len(answers))

    def test_every_question_id_has_a_correctly_shaped_answer(self):
        questions, answers = generate_questions_and_answers(self.phase5, seed=42)
        for q in questions:
            self.assertIn(q["id"], answers)
            if q["type"] == "yesno":
                self.assertIn("actualYes", answers[q["id"]])
                self.assertIsInstance(answers[q["id"]]["actualYes"], bool)
            else:
                self.assertEqual(q["type"], "multichoice")
                self.assertIn("options", q)
                self.assertIn("correctOption", answers[q["id"]])
                self.assertIn(answers[q["id"]]["correctOption"], q["options"])

    def test_deterministic_for_same_seed(self):
        q1, a1 = generate_questions_and_answers(self.phase5, seed=42)
        q2, a2 = generate_questions_and_answers(self.phase5, seed=42)
        self.assertEqual(q1, q2)
        self.assertEqual(a1, a2)

    def test_multichoice_options_are_never_duplicated(self):
        # Phase 5 has 7 films, so the same two characters can co-appear in
        # more than one — without deduping by partner name, a multichoice
        # question's options could silently repeat the same visible choice.
        # Sweep a range of seeds since this bug only manifests for some.
        for seed in range(1, 60):
            films = generate_films(seed=seed)
            characters = generate_characters(seed=seed)
            phase5 = generate_phase5(characters, seed=seed)
            questions, _ = generate_questions_and_answers(phase5, seed=seed)
            for q in questions:
                if q["type"] == "multichoice":
                    self.assertEqual(len(q["options"]), len(set(q["options"])),
                        f"seed={seed} question={q['id']} has duplicate options: {q['options']}")

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd portal/dataset/generator && python -m unittest test_questions -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'questions'`

- [ ] **Step 3: Write the question-generation implementation**

```python
# portal/dataset/generator/questions.py
from model import build_rng

SURVIVAL_COUNT = 8
TEAMUP_COUNT = 4
PARTNER_COUNT = 3
SCREENTIME_COUNT = 3

def generate_questions_and_answers(phase5, seed):
    rng = build_rng(seed + 9000)
    outcomes = phase5["characterOutcomes"]
    names = sorted(outcomes.keys())
    rng.shuffle(names)

    questions = []
    answers = {}
    next_id = 1

    def new_id():
        nonlocal next_id
        qid = f"q{next_id}"
        next_id += 1
        return qid

    for name in names[:SURVIVAL_COUNT]:
        qid = new_id()
        questions.append({"id": qid, "type": "yesno", "text": f"Will {name} survive Phase 5?"})
        answers[qid] = {"actualYes": outcomes[name]["survived"]}

    teamup_pool = names[SURVIVAL_COUNT:SURVIVAL_COUNT + TEAMUP_COUNT]
    for name in teamup_pool:
        qid = new_id()
        questions.append({"id": qid, "type": "yesno",
            "text": f"Will {name} appear in a team-up (2+ shared scenes) in Phase 5?"})
        answers[qid] = {"actualYes": outcomes[name]["hadTeamUp"]}

    # Deduped by partner name (summing shared_scenes across every Phase 5
    # film that pair co-appears in) — Phase 5 has 7 films, so the same two
    # characters can share scenes in more than one of them. Without dedup,
    # `options` could list the same character twice, producing a degenerate
    # multichoice question where a visible choice is silently repeated.
    co_by_char = {}
    for row in phase5["co_appearances"]:
        for a, b in ((row["character_a"], row["character_b"]), (row["character_b"], row["character_a"])):
            partners = co_by_char.setdefault(a, {})
            partners[b] = partners.get(b, 0) + row["shared_scenes"]
    partner_candidates = [n for n in names if len(co_by_char.get(n, {})) >= 2]
    rng.shuffle(partner_candidates)
    made = 0
    for name in partner_candidates:
        if made >= PARTNER_COUNT:
            break
        ranked = sorted(co_by_char[name].items(), key=lambda p: -p[1])
        options = [partner for partner, _ in ranked[:4]]
        if len(options) < 2:
            continue
        qid = new_id()
        questions.append({"id": qid, "type": "multichoice", "options": options,
            "text": f"Which character does {name} share the most scenes with in Phase 5?"})
        answers[qid] = {"correctOption": options[0]}
        made += 1

    screentime_by_char = {}
    for a in phase5["appearances"]:
        screentime_by_char[a["character"]] = screentime_by_char.get(a["character"], 0) + a["screentime_min"]
    pairable = [n for n in names if n in screentime_by_char]
    rng.shuffle(pairable)
    made = 0
    i = 0
    while made < SCREENTIME_COUNT and i + 1 < len(pairable):
        a_name, b_name = pairable[i], pairable[i + 1]
        i += 2
        if screentime_by_char[a_name] == screentime_by_char[b_name]:
            continue
        qid = new_id()
        questions.append({"id": qid, "type": "yesno",
            "text": f"Will {a_name} have more total screentime than {b_name} in Phase 5?"})
        answers[qid] = {"actualYes": screentime_by_char[a_name] > screentime_by_char[b_name]}
        made += 1

    return questions, answers
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd portal/dataset/generator && python -m unittest test_questions -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing test for the CLI/build**

```python
# portal/dataset/generator/test_build.py
import unittest, os, csv, json, shutil, tempfile
from build import build_dataset

class TestBuild(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_public_dir_has_no_phase5_data(self):
        build_dataset(seed=42, output_dir=self.tmp)
        with open(os.path.join(self.tmp, "public", "films.csv")) as f:
            rows = list(csv.DictReader(f))
        phases = {row["phase"] for row in rows}
        self.assertEqual(phases, {"1", "2", "3", "4"})

    def test_private_answer_key_has_phase5_and_resolved_questions(self):
        build_dataset(seed=42, output_dir=self.tmp)
        with open(os.path.join(self.tmp, "private", "answer_key.json")) as f:
            key = json.load(f)
        self.assertEqual(len(key["films"]), 7)
        self.assertGreater(len(key["appearances"]), 0)
        self.assertGreater(len(key["characterOutcomes"]), 0)
        with open(os.path.join(self.tmp, "public", "questions.json")) as f:
            questions = json.load(f)
        self.assertGreaterEqual(len(questions), 15)
        for q in questions:
            self.assertIn(q["id"], key)  # resolved answer flat-merged into answer_key.json

    def test_public_questions_file_has_no_answers(self):
        build_dataset(seed=42, output_dir=self.tmp)
        with open(os.path.join(self.tmp, "public", "questions.json")) as f:
            questions = json.load(f)
        for q in questions:
            self.assertNotIn("actualYes", q)
            self.assertNotIn("correctOption", q)

    def test_all_six_public_files_exist(self):
        build_dataset(seed=42, output_dir=self.tmp)
        for name in ["films.csv", "characters.csv", "appearances.csv",
                     "co_appearances.csv", "post_credits.csv", "roster.csv"]:
            self.assertTrue(os.path.exists(os.path.join(self.tmp, "public", name)), name)

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd portal/dataset/generator && python -m unittest test_build -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'build'`

- [ ] **Step 7: Write the CLI implementation**

```python
# portal/dataset/generator/build.py
import argparse, csv, json, os
from entities import generate_films, generate_characters
from appearances import generate_appearances, generate_co_appearances, generate_post_credits
from phase5 import generate_phase5
from questions import generate_questions_and_answers
from traps import verify_simpsons_paradox, verify_survivorship_gap, verify_leaky_column

def _write_csv(path, rows, fields):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

def build_dataset(seed, output_dir):
    films = generate_films(seed)
    characters = generate_characters(seed)
    appearances = generate_appearances(films, characters, seed)
    co_appearances = generate_co_appearances(appearances, seed)
    post_credits = generate_post_credits(films, appearances, seed)
    phase5 = generate_phase5(characters, seed)
    questions, question_answers = generate_questions_and_answers(phase5, seed)

    assert verify_simpsons_paradox(films), "Simpson's paradox trap failed — tune generation coefficients"
    assert verify_survivorship_gap(characters, appearances), "survivorship trap failed"
    assert verify_leaky_column(appearances, phase5["appearances"]), "leaky column trap failed"

    public = os.path.join(output_dir, "public")
    _write_csv(os.path.join(public, "films.csv"), films,
        ["name", "phase", "year", "budget_m", "opening_weekend_m", "worldwide_gross_m", "critic_score", "audience_score"])
    _write_csv(os.path.join(public, "characters.csv"), characters,
        ["name", "faction", "first_film", "powered", "centrality"])
    _write_csv(os.path.join(public, "appearances.csv"), appearances,
        ["character", "film", "screentime_min", "dialogue_lines", "billing_order", "final_billing_position", "survived"])
    _write_csv(os.path.join(public, "co_appearances.csv"), co_appearances,
        ["character_a", "character_b", "film", "shared_scenes"])
    _write_csv(os.path.join(public, "post_credits.csv"), post_credits,
        ["film", "character_teased", "paid_off_in_film"])
    _write_csv(os.path.join(public, "roster.csv"), characters,
        ["name", "faction", "powered"])
    with open(os.path.join(public, "questions.json"), "w") as f:
        json.dump(questions, f, indent=2)

    private = os.path.join(output_dir, "private")
    os.makedirs(private, exist_ok=True)
    answer_key = dict(phase5)
    answer_key.update(question_answers)  # flat-merge: q1, q2, ... alongside films/appearances/etc.
    with open(os.path.join(private, "answer_key.json"), "w") as f:
        json.dump(answer_key, f, indent=2)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", default="./output")
    args = parser.parse_args()
    build_dataset(args.seed, args.out)
    print(f"Dataset written to {args.out}/public (participant files) and {args.out}/private (answer key — do not distribute)")
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd portal/dataset/generator && python -m unittest test_build -v`
Expected: PASS (4 tests)

- [ ] **Step 9: Commit**

```bash
git add portal/dataset/generator/questions.py portal/dataset/generator/build.py portal/dataset/generator/test_questions.py portal/dataset/generator/test_build.py
git commit -m "feat: generate Round 2 prediction questions and resolved answers, wire into CLI build"
```

---

## Phase 2 — Scoring Engine (pure JS, shared by client and Cloud Functions)

### Task 5: Brier scoring (yes/no and multi-choice)

**Files:**
- Create: `portal/shared/scoring.js`
- Test: `portal/shared/scoring.test.js`

**Interfaces:**
- Produces: `brierScore(p, actualYes) -> number` — `p` is 0–100, returns 0–100 points.
- Produces: `multiChoiceScore(probabilities, correctOption) -> number` — `probabilities` is `{option: p, ...}` summing to 100.

- [ ] **Step 1: Write the failing test**

```javascript
// portal/shared/scoring.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { brierScore, multiChoiceScore } = require('./scoring.js');

test('50% confidence always scores 75, regardless of outcome', () => {
  assert.equal(brierScore(50, true), 75);
  assert.equal(brierScore(50, false), 75);
});

test('90% confident and right scores 99', () => {
  assert.equal(brierScore(90, true), 99);
});

test('90% confident and wrong scores 19', () => {
  assert.equal(brierScore(90, false), 19);
});

test('100% confidence and wrong scores 0', () => {
  assert.equal(brierScore(100, false), 0);
});

test('100% confidence and right scores 100', () => {
  assert.equal(brierScore(100, true), 100);
});

test('multiChoiceScore scores against the probability placed on the correct option', () => {
  const score = multiChoiceScore({ A: 60, B: 30, C: 10 }, 'A');
  assert.equal(score, brierScore(60, true));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd portal/shared && node --test scoring.test.js`
Expected: FAIL with `Cannot find module './scoring.js'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// portal/shared/scoring.js
function brierScore(p, actualYes) {
  const prob = p / 100;
  const penalty = actualYes ? Math.pow(1 - prob, 2) : Math.pow(prob, 2);
  return Math.round(100 * (1 - penalty) * 100) / 100;
}

function multiChoiceScore(probabilities, correctOption) {
  const pCorrect = probabilities[correctOption] || 0;
  return brierScore(pCorrect, true);
}

module.exports = { brierScore, multiChoiceScore };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd portal/shared && node --test scoring.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add portal/shared/scoring.js portal/shared/scoring.test.js
git commit -m "feat: Brier scoring engine for yes/no and multi-choice predictions"
```

---

### Task 6: Draft scoring + final leaderboard combination

**Files:**
- Create: `portal/shared/draftScoring.js`
- Create: `portal/shared/leaderboard.js`
- Test: `portal/shared/draftScoring.test.js`
- Test: `portal/shared/leaderboard.test.js`

**Interfaces:**
- Consumes: nothing from Task 5 directly (independent scoring path), but feeds into `leaderboard.js` alongside Predict scores.
- Produces: `draftCharacterScore(outcome) -> number` where `outcome = { survived: bool, topThirdScreentime: bool, hadTeamUp: bool }`, max 65/character.
- Produces: `draftTeamScore(characterOutcomes: outcome[]) -> number`, max 195/team (3 characters).
- Produces: `combineLeaderboard(predictRaw, draftRaw, reportRaw) -> { total, predictPct, draftPct, reportPct }` where inputs are already-normalized 0–100 percentages per round.
- Produces: `rankTeams(teams: {id, total, predictRaw, submittedAt}[]) -> sortedTeams[]` implementing the tie-break order from spec §9.

- [ ] **Step 1: Write the failing tests**

```javascript
// portal/shared/draftScoring.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { draftCharacterScore, draftTeamScore } = require('./draftScoring.js');

test('a character who survived, had top-third screentime, and teamed up scores 65', () => {
  assert.equal(draftCharacterScore({ survived: true, topThirdScreentime: true, hadTeamUp: true }), 65);
});

test('a character who did none of it scores 0', () => {
  assert.equal(draftCharacterScore({ survived: false, topThirdScreentime: false, hadTeamUp: false }), 0);
});

test('team score sums 3 characters, max 195', () => {
  const full = { survived: true, topThirdScreentime: true, hadTeamUp: true };
  assert.equal(draftTeamScore([full, full, full]), 195);
});
```

```javascript
// portal/shared/leaderboard.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { combineLeaderboard, rankTeams } = require('./leaderboard.js');

test('spec worked example: Team A (82/60/90) beats Team B (95/40/50)', () => {
  const a = combineLeaderboard(82, 60, 90);
  const b = combineLeaderboard(95, 40, 50);
  assert.equal(a.total, 80);
  assert.equal(b.total, 70.5);
  assert.ok(a.total > b.total);
});

test('tie-break falls back to higher raw Predict score', () => {
  const teams = [
    { id: 'X', total: 80, predictRaw: 1200, submittedAt: 100 },
    { id: 'Y', total: 80, predictRaw: 1400, submittedAt: 50 },
  ];
  const ranked = rankTeams(teams);
  assert.equal(ranked[0].id, 'Y');
});

test('second tie-break falls back to earlier submission timestamp', () => {
  const teams = [
    { id: 'X', total: 80, predictRaw: 1200, submittedAt: 100 },
    { id: 'Y', total: 80, predictRaw: 1200, submittedAt: 50 },
  ];
  const ranked = rankTeams(teams);
  assert.equal(ranked[0].id, 'Y');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd portal/shared && node --test draftScoring.test.js leaderboard.test.js`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Write minimal implementation**

```javascript
// portal/shared/draftScoring.js
function draftCharacterScore(outcome) {
  let score = 0;
  if (outcome.survived) score += 30;
  if (outcome.topThirdScreentime) score += 20;
  if (outcome.hadTeamUp) score += 15;
  return score;
}

function draftTeamScore(characterOutcomes) {
  return characterOutcomes.reduce((sum, o) => sum + draftCharacterScore(o), 0);
}

module.exports = { draftCharacterScore, draftTeamScore };
```

```javascript
// portal/shared/leaderboard.js
const WEIGHTS = { predict: 0.5, draft: 0.2, report: 0.3 };

function combineLeaderboard(predictPct, draftPct, reportPct) {
  const total = Math.round(
    (WEIGHTS.predict * predictPct + WEIGHTS.draft * draftPct + WEIGHTS.report * reportPct) * 100
  ) / 100;
  return { total, predictPct, draftPct, reportPct };
}

function rankTeams(teams) {
  return [...teams].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.predictRaw !== a.predictRaw) return b.predictRaw - a.predictRaw;
    return a.submittedAt - b.submittedAt;
  });
}

module.exports = { combineLeaderboard, rankTeams };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd portal/shared && node --test draftScoring.test.js leaderboard.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add portal/shared/draftScoring.js portal/shared/leaderboard.js portal/shared/draftScoring.test.js portal/shared/leaderboard.test.js
git commit -m "feat: draft scoring and weighted leaderboard combination with tie-break"
```

---

## Phase 3 — Firebase Backend

### Task 7: Firebase project scaffold + Firestore security rules

**Files:**
- Create: `portal/firebase.json`
- Create: `portal/firestore.rules`
- Create: `portal/firestore.indexes.json`
- Create: `portal/functions/package.json`
- Create: `portal/functions/index.js` (empty export scaffold, filled in Tasks 8–9)

**Interfaces:**
- Produces: Firestore collections contract used by every later task —
  - `questions/{questionId}` — public read, no write from clients. Fields: `text, type (yesno|multichoice), options?`.
  - `submissions/{teamId}_{questionId}` — client can `create` a doc whose ID matches `{teamId}_{questionId}` from its own fields, cannot `read` (any doc — including other teams'), cannot `update`/`delete`. Fields: `teamId, questionId, probabilities, submittedAt`. **No Firebase Authentication exists anywhere in this plan** (team identity is a self-chosen string, honor-system for a single-room supervised 4-hour event, not an adversarial-identity threat model) — the rule therefore validates document-ID/field consistency and immutability, not `request.auth`. This is a deliberate scope decision, not an oversight: the spec's actual security concern (§10) is the answer key never leaking, not preventing one team from typing another team's name.
  - `leaderboard/{teamId}` — public read, write only from Cloud Functions (admin SDK bypasses rules; no client write rule exists, matching the pattern used for `predictRaw` and `draftRaw` — `reportRaw` is written the same way by the `onJudgeScoreCreate` trigger in Task 9, not by `judge.js` directly).
  - `answer_key` — **no client read or write rule at all** (default-deny). Only the Cloud Functions admin SDK can touch it.
  - `draft_picks/{characterId}` — public read; client `create` allowed only if the doc doesn't already exist (enforces "first pick wins", full validation happens in the Cloud Function in Task 9).
  - `judge_scores/{judgeId}_{reportId}` — client can `create` only, cannot `read`/`update`/`delete` (mirrors `submissions` — write-once, no client aggregation). `onJudgeScoreCreate` (Task 9) reads across a report's judge scores and writes the averaged `reportRaw` into `leaderboard`.
  - `reveal_state/status` — public read; no client write (admin-only, flips when Phase 5 unlocks).

- [ ] **Step 1: Write the rules (no automated test — Firestore rules are verified via the emulator in Task 8's manual step)**

```json
// portal/firebase.json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [{ "source": "functions", "codebase": "default" }],
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  },
  "emulators": {
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": true }
  }
}
```

```
// portal/firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /questions/{questionId} {
      allow read: if true;
      allow write: if false;
    }
    match /submissions/{submissionId} {
      allow create: if submissionId == request.resource.data.teamId + '_' + request.resource.data.questionId
                    && request.resource.data.teamId is string
                    && request.resource.data.questionId is string;
      allow read, update, delete: if false;
    }
    match /leaderboard/{teamId} {
      allow read: if true;
      allow write: if false;
    }
    match /answer_key/{doc} {
      allow read, write: if false;
    }
    match /draft_picks/{characterId} {
      allow read: if true;
      allow create: if !exists(/databases/$(database)/documents/draft_picks/$(characterId));
      allow update, delete: if false;
    }
    match /judge_scores/{scoreId} {
      allow create: if scoreId == request.resource.data.judgeId + '_' + request.resource.data.reportId;
      allow read, update, delete: if false;
    }
    match /reveal_state/{doc} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

```json
// portal/firestore.indexes.json
{ "indexes": [], "fieldOverrides": [] }
```

```json
// portal/functions/package.json
{
  "name": "doomsday-functions",
  "version": "1.0.0",
  "engines": { "node": "20" },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  }
}
```

```javascript
// portal/functions/index.js
const admin = require('firebase-admin');
admin.initializeApp();

// Filled in by Task 8 (submitPrediction, submitDraftPick) and
// Task 9 (revealPhase5).
module.exports = {};
```

- [ ] **Step 2: N/A — scaffold task, no test to fail first**

- [ ] **Step 3: Verify the scaffold is internally consistent**

Run: `cd portal && node -e "JSON.parse(require('fs').readFileSync('firebase.json'))" && echo "firebase.json valid JSON"`
Expected: prints `firebase.json valid JSON`

- [ ] **Step 4: N/A — no runtime behavior yet to verify**

- [ ] **Step 5: Commit**

```bash
git add portal/firebase.json portal/firestore.rules portal/firestore.indexes.json portal/functions/package.json portal/functions/index.js
git commit -m "chore: scaffold Firebase project, Firestore security rules, functions package"
```

---

### Task 8: Cloud Function — submitPrediction (grades Brier score server-side)

**Files:**
- Create: `portal/functions/submitPrediction.js`
- Modify: `portal/functions/index.js`
- Test: `portal/functions/test_submitPrediction_logic.js` (pure-logic unit test, no emulator needed)

**Interfaces:**
- Consumes: `brierScore`, `multiChoiceScore` from `portal/shared/scoring.js` (Task 5).
- Produces: `computeSubmissionScore(question, submission, answerKey) -> number` — the pure function the Cloud Function trigger wraps. Exported separately from the Firestore trigger itself so it's unit-testable without the emulator.
- Produces: Firestore trigger `onSubmissionCreate` (wired in `index.js`) that reads `answer_key` (server-only), calls `computeSubmissionScore`, and writes the result into `leaderboard/{teamId}.predictRaw` (incremented) via a transaction.

- [ ] **Step 1: Write the failing test for the pure logic**

```javascript
// portal/functions/test_submitPrediction_logic.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeSubmissionScore } = require('./submitPrediction.js');

test('yesno question scores via brierScore against the answer key', () => {
  const question = { id: 'q1', type: 'yesno' };
  const submission = { probabilities: { yes: 90 } };
  const answerKey = { q1: { actualYes: true } };
  assert.equal(computeSubmissionScore(question, submission, answerKey), 99);
});

test('multichoice question scores via multiChoiceScore against the answer key', () => {
  const question = { id: 'q2', type: 'multichoice', options: ['A', 'B', 'C'] };
  const submission = { probabilities: { A: 60, B: 30, C: 10 } };
  const answerKey = { q2: { correctOption: 'A' } };
  assert.equal(computeSubmissionScore(question, submission, answerKey), 60 * 60 / 100 + 40); // = brierScore(60,true) = 84
});

test('unanswered question defaults to 50 percent per team', () => {
  const question = { id: 'q3', type: 'yesno' };
  const submission = { probabilities: {} };
  const answerKey = { q3: { actualYes: false } };
  assert.equal(computeSubmissionScore(question, submission, answerKey), 75);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd portal/functions && node --test test_submitPrediction_logic.js`
Expected: FAIL with `Cannot find module './submitPrediction.js'`

- [ ] **Step 3: Write minimal implementation**

```javascript
// portal/functions/submitPrediction.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { brierScore, multiChoiceScore } = require('../shared/scoring.js');

function computeSubmissionScore(question, submission, answerKey) {
  const key = answerKey[question.id];
  if (question.type === 'yesno') {
    const p = submission.probabilities.yes !== undefined ? submission.probabilities.yes : 50;
    return brierScore(p, key.actualYes);
  }
  if (question.type === 'multichoice') {
    const probs = Object.keys(submission.probabilities).length > 0
      ? submission.probabilities
      : Object.fromEntries(question.options.map(o => [o, 100 / question.options.length]));
    return multiChoiceScore(probs, key.correctOption);
  }
  throw new Error(`Unknown question type: ${question.type}`);
}

const onSubmissionCreate = functions.firestore
  .document('submissions/{submissionId}')
  .onCreate(async (snap) => {
    const submission = snap.data();
    const db = admin.firestore();

    const [questionDoc, answerKeyDoc] = await Promise.all([
      db.collection('questions').doc(submission.questionId).get(),
      db.collection('answer_key').doc('phase5').get(),
    ]);
    if (!questionDoc.exists || !answerKeyDoc.exists) return;

    const question = { id: submission.questionId, ...questionDoc.data() };
    const answerKey = answerKeyDoc.data();
    const points = computeSubmissionScore(question, submission, answerKey);

    const leaderboardRef = db.collection('leaderboard').doc(submission.teamId);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(leaderboardRef);
      const current = doc.exists ? doc.data() : { predictRaw: 0, draftRaw: 0, reportRaw: 0 };
      tx.set(leaderboardRef, { ...current, predictRaw: current.predictRaw + points }, { merge: true });
    });
  });

module.exports = { computeSubmissionScore, onSubmissionCreate };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd portal/functions && node --test test_submitPrediction_logic.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Wire into index.js and commit**

```javascript
// portal/functions/index.js
const admin = require('firebase-admin');
admin.initializeApp();

const { onSubmissionCreate } = require('./submitPrediction.js');

exports.onSubmissionCreate = onSubmissionCreate;
```

```bash
git add portal/functions/submitPrediction.js portal/functions/index.js portal/functions/test_submitPrediction_logic.js
git commit -m "feat: server-side Brier grading via Firestore trigger, unit-tested pure logic"
```

**Manual verification (Firebase emulator, no live account needed):**
Run: `cd portal && firebase emulators:start --only firestore,functions` (requires `firebase-tools` installed globally: `npm install -g firebase-tools`, and Java 11+ for the Firestore emulator). Create a `submissions/team1_q1` document via the emulator UI at `http://localhost:4000`, confirm `leaderboard/team1.predictRaw` populates.

---

### Task 9: Cloud Functions — submitDraftPick, judge-score aggregation, and revealPhase5

**Files:**
- Create: `portal/functions/draftPick.js`
- Create: `portal/functions/revealPhase5.js`
- Create: `portal/functions/judgeScore.js`
- Modify: `portal/functions/index.js`
- Test: `portal/functions/test_draftPick_logic.js`
- Test: `portal/functions/test_judgeScore_logic.js`

**Interfaces:**
- Consumes: `draftCharacterScore` from `portal/shared/draftScoring.js` (Task 6).
- Produces: `computeDraftAssignment(existingPicks, requestedCharacterId, teamId) -> { allowed: bool, reason?: string }` — pure function; the Cloud Function wraps it in a Firestore transaction for atomicity.
- Produces: callable Cloud Function `revealPhase5` — admin-only (checks a custom claim `isAdmin`), copies the private `answer_key` outcomes needed for draft scoring into `leaderboard/{teamId}.draftRaw` for every team with picks, and flips `reveal_state/status.revealed = true`.
- Produces: `computeAggregateReportScore(scoresForReport: {total: number}[]) -> number` — averages every judge's total for one report (rounded to 2 decimals); the Firestore trigger `onJudgeScoreCreate` wraps it, re-querying all `judge_scores` for that `reportId` on every new score and writing the average into `leaderboard/{teamId}.reportRaw`. This exists because Task 15's `judge.js` can only `create` in `judge_scores` (Task 7's rules forbid client writes to `leaderboard`), so aggregation must happen server-side.

- [ ] **Step 1: Write the failing test**

```javascript
// portal/functions/test_draftPick_logic.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeDraftAssignment } = require('./draftPick.js');

test('a character with no existing pick is allowed', () => {
  const result = computeDraftAssignment({}, 'shuri', 'team1');
  assert.equal(result.allowed, true);
});

test('a character already picked by another team is rejected', () => {
  const result = computeDraftAssignment({ shuri: 'team2' }, 'shuri', 'team1');
  assert.equal(result.allowed, false);
  assert.match(result.reason, /already/i);
});

test('a team cannot pick the same character twice under their own id (idempotent no-op stays rejected)', () => {
  const result = computeDraftAssignment({ shuri: 'team1' }, 'shuri', 'team1');
  assert.equal(result.allowed, false);
});
```

```javascript
// portal/functions/test_judgeScore_logic.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeAggregateReportScore } = require('./judgeScore.js');

test('a single judge score is the average of one', () => {
  assert.equal(computeAggregateReportScore([{ total: 80 }]), 80);
});

test('two judges average to the midpoint', () => {
  assert.equal(computeAggregateReportScore([{ total: 80 }, { total: 90 }]), 85);
});

test('rounds to 2 decimal places', () => {
  assert.equal(computeAggregateReportScore([{ total: 70 }, { total: 71 }, { total: 71 }]), 70.67);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd portal/functions && node --test test_draftPick_logic.js test_judgeScore_logic.js`
Expected: FAIL — `./draftPick.js` and `./judgeScore.js` don't exist yet.

- [ ] **Step 3: Write minimal implementation**

```javascript
// portal/functions/draftPick.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

function computeDraftAssignment(existingPicks, characterId, teamId) {
  if (existingPicks[characterId]) {
    return { allowed: false, reason: `Character already picked by ${existingPicks[characterId]}` };
  }
  return { allowed: true };
}

const onDraftPickCreate = functions.firestore
  .document('draft_picks/{characterId}')
  .onCreate(async (snap, context) => {
    // Firestore's `create`-only security rule already prevents overwriting
    // an existing doc; this trigger just logs/no-ops. Real contention
    // is resolved by Firestore's atomic document creation semantics —
    // two simultaneous creates on the same doc ID, one wins, one errors
    // client-side and the client re-renders the now-taken character.
    return null;
  });

module.exports = { computeDraftAssignment, onDraftPickCreate };
```

```javascript
// portal/functions/revealPhase5.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { draftTeamScore } = require('../shared/draftScoring.js');

const revealPhase5 = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.isAdmin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  const db = admin.firestore();
  const answerKeyDoc = await db.collection('answer_key').doc('phase5').get();
  const answerKey = answerKeyDoc.data();

  const picksSnap = await db.collection('draft_picks').get();
  const picksByTeam = {};
  picksSnap.forEach(doc => {
    const { teamId, characterName } = doc.data();
    picksByTeam[teamId] = picksByTeam[teamId] || [];
    // characterOutcomes in the answer key is keyed by the real character
    // name (e.g. "Shuri"), not the slugified draft_picks doc ID (e.g.
    // "shuri") — the pick doc must carry characterName for this lookup
    // to resolve. See Task 13's draft.js, which writes both fields.
    picksByTeam[teamId].push(characterName);
  });

  const batch = db.batch();
  for (const [teamId, characterNames] of Object.entries(picksByTeam)) {
    const outcomes = characterNames.map(name => answerKey.characterOutcomes[name] || {
      survived: false, topThirdScreentime: false, hadTeamUp: false,
    });
    const draftRaw = draftTeamScore(outcomes);
    batch.set(db.collection('leaderboard').doc(teamId), { draftRaw }, { merge: true });
  }
  batch.set(db.collection('reveal_state').doc('status'), { revealed: true, revealedAt: Date.now() });
  await batch.commit();
  return { teamsScored: Object.keys(picksByTeam).length };
});

module.exports = { revealPhase5 };
```

```javascript
// portal/functions/judgeScore.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

function computeAggregateReportScore(scoresForReport) {
  const sum = scoresForReport.reduce((acc, s) => acc + s.total, 0);
  return Math.round((sum / scoresForReport.length) * 100) / 100;
}

const onJudgeScoreCreate = functions.firestore
  .document('judge_scores/{scoreId}')
  .onCreate(async (snap) => {
    const { reportId, teamId } = snap.data();
    const db = admin.firestore();
    const scoresSnap = await db.collection('judge_scores').where('reportId', '==', reportId).get();
    const scores = [];
    scoresSnap.forEach(doc => scores.push(doc.data()));
    const reportRaw = computeAggregateReportScore(scores);
    await db.collection('leaderboard').doc(teamId).set({ reportRaw }, { merge: true });
  });

module.exports = { computeAggregateReportScore, onJudgeScoreCreate };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd portal/functions && node --test test_draftPick_logic.js test_judgeScore_logic.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Wire into index.js and commit**

```javascript
// portal/functions/index.js
const admin = require('firebase-admin');
admin.initializeApp();

const { onSubmissionCreate } = require('./submitPrediction.js');
const { onDraftPickCreate } = require('./draftPick.js');
const { revealPhase5 } = require('./revealPhase5.js');
const { onJudgeScoreCreate } = require('./judgeScore.js');

exports.onSubmissionCreate = onSubmissionCreate;
exports.onDraftPickCreate = onDraftPickCreate;
exports.revealPhase5 = revealPhase5;
exports.onJudgeScoreCreate = onJudgeScoreCreate;
```

```bash
git add portal/functions/draftPick.js portal/functions/revealPhase5.js portal/functions/judgeScore.js portal/functions/index.js portal/functions/test_draftPick_logic.js portal/functions/test_judgeScore_logic.js
git commit -m "feat: draft pick contention handling, judge-score aggregation, admin-only Phase 5 reveal"
```

**Also update Firestore indexes:** `judge_scores` is queried by `reportId` (not just fetched by doc ID) in `onJudgeScoreCreate` — Firestore auto-creates single-field indexes, so `portal/firestore.indexes.json` from Task 7 needs no manual entry for this query, but confirm during manual verification that the emulator doesn't report a missing-index error; if it does, add the composite index it suggests to `firestore.indexes.json`.

---

## Phase 4 — Frontend Portal

### Task 10: Shared shell, dark-tech theme, Earth-4471 banner

**Files:**
- Create: `portal/public/shared/theme.css`
- Create: `portal/public/shared/nav.js`
- Create: `portal/public/shared/banner.js`

**Interfaces:**
- Produces: CSS custom properties consumed by every page: `--bg`, `--accent-red`, `--accent-red-light`, `--accent-green`, `--accent-green-light`, `--text-primary`, `--text-muted`, `--panel-bg`.
- Produces: `renderBanner()` — injects the "This is not Earth-616" warning banner into any page that calls it, at the top of `<body>`.
- Produces: `renderNav(activePage: string)` — injects a consistent top nav across all 6 pages, highlighting the current page.

- [ ] **Step 1: No automated test — this is visual/DOM scaffolding verified manually via browser in Step 4.**

- [ ] **Step 2: N/A**

- [ ] **Step 3: Write the implementation**

```css
/* portal/public/shared/theme.css */
:root {
  --bg: #0c0f12;
  --accent-red: #e23636;
  --accent-red-light: #ff6b6b;
  --accent-green: #2ecc71;
  --accent-green-light: #58d68d;
  --text-primary: #f5f5f0;
  --text-muted: #9a9a95;
  --panel-bg: rgba(255, 255, 255, 0.04);
}

* { box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text-primary);
  font-family: 'Outfit', 'Montserrat', sans-serif;
  margin: 0;
  min-height: 100vh;
}

.panel {
  background: var(--panel-bg);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.5rem;
}

.accent-red { color: var(--accent-red-light); }
.accent-green { color: var(--accent-green-light); }

.banner-earth4471 {
  background: linear-gradient(90deg, var(--accent-red) 0%, var(--accent-green) 100%);
  color: #0c0f12;
  font-weight: 700;
  text-align: center;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
}

nav.top-nav {
  display: flex;
  gap: 1.5rem;
  padding: 1rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

nav.top-nav a {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 600;
}

nav.top-nav a.active {
  color: var(--accent-green-light);
}
```

```javascript
// portal/public/shared/banner.js
function renderBanner() {
  const el = document.createElement('div');
  el.className = 'banner-earth4471';
  el.textContent = 'EARTH-4471 ARCHIVE — This is not Earth-616. Anything you remember about the real MCU is wrong here.';
  document.body.prepend(el);
}
```

```javascript
// portal/public/shared/nav.js
const PAGES = [
  { id: 'landing', label: 'Home', href: 'index.html' },
  { id: 'predict', label: 'Predict', href: 'predict.html' },
  { id: 'draft', label: 'Draft', href: 'draft.html' },
  { id: 'report', label: 'Report', href: 'report.html' },
  { id: 'leaderboard', label: 'Leaderboard', href: 'admin.html' },
];

function renderNav(activePage) {
  const nav = document.createElement('nav');
  nav.className = 'top-nav';
  PAGES.forEach(p => {
    const a = document.createElement('a');
    a.href = p.href;
    a.textContent = p.label;
    if (p.id === activePage) a.classList.add('active');
    nav.appendChild(a);
  });
  document.body.insertBefore(nav, document.body.children[1] || null);
}
```

- [ ] **Step 4: Manual verification**

Create a throwaway `portal/public/shared/_preview.html` that links `theme.css` and calls `renderBanner()` + `renderNav('landing')`, then use the browse skill: `$B goto file://<abs path>/_preview.html`, `$B screenshot /tmp/theme-preview.png`, confirm the banner gradient and nav render, then delete `_preview.html`.

- [ ] **Step 5: Commit**

```bash
git add portal/public/shared/theme.css portal/public/shared/nav.js portal/public/shared/banner.js
git commit -m "feat: shared dark-tech theme, Earth-4471 banner, top nav"
```

---

### Task 11: Landing page

**Files:**
- Create: `portal/public/index.html`
- Create: `portal/public/shared/firebaseConfig.js` (placeholder values, filled in by the user during deployment)

**Interfaces:**
- Consumes: `theme.css`, `nav.js`, `banner.js` from Task 10.
- Produces: a working download link to `portal/dataset/generator/output/public/*.csv` (built by running Task 4's CLI before the event) and a live countdown to Round 2's close time (read from a `config/event.json` static file with a fixed ISO timestamp, editable per actual event day).

- [ ] **Step 1–2: N/A — static content page, no unit-testable logic**

- [ ] **Step 3: Write the implementation**

```javascript
// portal/public/shared/firebaseConfig.js
// Replace with your own Firebase project's config from the Firebase console
// (Project Settings → General → Your apps → SDK setup and configuration).
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};
```

```html
<!-- portal/public/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Doomsday Algorithm — V-TAPP 2026</title>
  <link rel="stylesheet" href="shared/theme.css">
</head>
<body>
  <script src="shared/banner.js"></script>
  <script src="shared/nav.js"></script>
  <main style="max-width:900px;margin:2rem auto;padding:0 1.5rem;">
    <h1 class="accent-red">DOOMSDAY <span class="accent-green">ALGORITHM</span></h1>
    <p>MCU Doomsday Prediction Challenge — Data Science Club, V-TAPP 2026</p>
    <div class="panel">
      <h2>Get the dataset</h2>
      <p>Earth-4471 Archive — Phases 1–4. Opens directly in Excel, or load with Python/SQL/R.</p>
      <a href="../dataset/generator/output/public/films.csv" download>films.csv</a> ·
      <a href="../dataset/generator/output/public/characters.csv" download>characters.csv</a> ·
      <a href="../dataset/generator/output/public/appearances.csv" download>appearances.csv</a> ·
      <a href="../dataset/generator/output/public/co_appearances.csv" download>co_appearances.csv</a> ·
      <a href="../dataset/generator/output/public/post_credits.csv" download>post_credits.csv</a> ·
      <a href="../dataset/generator/output/public/roster.csv" download>roster.csv</a>
    </div>
    <div class="panel" style="margin-top:1.5rem;">
      <h2>Round 2 closes in</h2>
      <div id="countdown" style="font-size:2rem;font-weight:700;"></div>
    </div>
  </main>
  <script>
    fetch('config/event.json').then(r => r.json()).then(cfg => {
      const target = new Date(cfg.round2CloseISO).getTime();
      const el = document.getElementById('countdown');
      setInterval(() => {
        const diff = Math.max(0, target - Date.now());
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        el.textContent = `${h}h ${m}m ${s}s`;
      }, 1000);
    });
  </script>
</body>
</html>
```

```json
// portal/public/config/event.json
{ "round2CloseISO": "2026-09-11T14:15:00+05:30" }
```

- [ ] **Step 4: Manual verification**

Run: `cd portal/dataset/generator && python build.py --seed 42 --out ../generator_output` then move/symlink output into `portal/public/dataset_output` so the download links resolve, or adjust the `href`s above to match wherever Task 4's output lands. Use the browse skill: `$B goto file://<abs path>/portal/public/index.html`, `$B click` each download link, `$B is visible "#countdown"`, confirm the timer ticks.

- [ ] **Step 5: Commit**

```bash
git add portal/public/index.html portal/public/shared/firebaseConfig.js portal/public/config/event.json
git commit -m "feat: landing page with dataset downloads and live countdown"
```

---

### Task 12: Predict page

**Files:**
- Create: `portal/public/predict.html`
- Create: `portal/public/predict.js`

**Interfaces:**
- Consumes: `scoring.js` (Task 5, loaded client-side for instant local preview only — the authoritative score always comes from the Cloud Function in Task 8), Firestore `questions` and `leaderboard` collections (Task 7).
- Produces: a form rendering each question from `questions`, a probability input (0–100) per option, a submit button that writes to `submissions/{teamId}_{questionId}`, and a live-updating leaderboard table subscribed via `onSnapshot`.

- [ ] **Step 1–2: N/A — this task is DOM/Firestore wiring; scoring math itself is already unit-tested in Task 5**

- [ ] **Step 3: Write the implementation**

```html
<!-- portal/public/predict.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Predict — Doomsday Algorithm</title>
  <link rel="stylesheet" href="shared/theme.css">
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
  <script src="shared/firebaseConfig.js"></script>
</head>
<body>
  <script src="shared/banner.js"></script>
  <script src="shared/nav.js"></script>
  <main style="max-width:900px;margin:2rem auto;padding:0 1.5rem;">
    <h1 class="accent-green">Round 2 — Predict</h1>
    <div id="team-id-prompt" class="panel">
      <label>Team ID: <input id="team-id-input" type="text"></label>
      <button id="team-id-save">Continue</button>
    </div>
    <div id="questions" style="display:none;"></div>
    <h2 style="margin-top:2rem;">Live Leaderboard</h2>
    <table id="leaderboard-table" style="width:100%;"></table>
  </main>
  <script src="predict.js"></script>
</body>
</html>
```

```javascript
// portal/public/predict.js
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let teamId = localStorage.getItem('doomsday_team_id');

function initTeamPrompt() {
  if (teamId) {
    document.getElementById('team-id-prompt').style.display = 'none';
    document.getElementById('questions').style.display = 'block';
    loadQuestions();
    return;
  }
  document.getElementById('team-id-save').addEventListener('click', () => {
    const val = document.getElementById('team-id-input').value.trim();
    if (!val) return;
    localStorage.setItem('doomsday_team_id', val);
    teamId = val;
    document.getElementById('team-id-prompt').style.display = 'none';
    document.getElementById('questions').style.display = 'block';
    loadQuestions();
  });
}

function loadQuestions() {
  db.collection('questions').get().then(snap => {
    const container = document.getElementById('questions');
    snap.forEach(doc => {
      const q = doc.data();
      const div = document.createElement('div');
      div.className = 'panel';
      div.style.marginBottom = '1rem';
      div.innerHTML = `
        <p>${q.text}</p>
        <input type="range" min="0" max="100" value="50" id="range-${doc.id}">
        <span id="val-${doc.id}">50</span>%
        <button id="submit-${doc.id}">Submit</button>
      `;
      container.appendChild(div);
      const range = div.querySelector(`#range-${doc.id}`);
      const val = div.querySelector(`#val-${doc.id}`);
      range.addEventListener('input', () => { val.textContent = range.value; });
      div.querySelector(`#submit-${doc.id}`).addEventListener('click', () => {
        db.collection('submissions').doc(`${teamId}_${doc.id}`).set({
          teamId, questionId: doc.id,
          probabilities: { yes: Number(range.value) },
          submittedAt: Date.now(),
        });
      });
    });
  });
}

function subscribeLeaderboard() {
  db.collection('leaderboard').onSnapshot(snap => {
    const rows = [];
    snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
    rows.sort((a, b) => (b.predictRaw || 0) - (a.predictRaw || 0));
    const table = document.getElementById('leaderboard-table');
    table.innerHTML = '<tr><th>Team</th><th>Predict score</th></tr>' +
      rows.map(r => `<tr><td>${r.id}</td><td>${(r.predictRaw || 0).toFixed(1)}</td></tr>`).join('');
  });
}

initTeamPrompt();
subscribeLeaderboard();
```

- [ ] **Step 4: Manual verification**

With the Firebase emulator running (`firebase emulators:start`), point `firebaseConfig.js` at the emulator (`firebase.firestore().useEmulator('localhost', 8080)` added in `predict.js` for local testing), seed a `questions` doc via the emulator UI, then use the browse skill: `$B goto file://<abs>/portal/public/predict.html`, fill team ID, `$B snapshot -i` to find the range input ref, `$B fill @eN 80`, click submit, confirm the leaderboard table updates.

- [ ] **Step 5: Commit**

```bash
git add portal/public/predict.html portal/public/predict.js
git commit -m "feat: predict page with live probability submission and leaderboard"
```

---

### Task 13: Draft page

**Files:**
- Create: `portal/public/draft.html`
- Create: `portal/public/draft.js`

**Interfaces:**
- Consumes: Firestore `draft_picks` collection (Task 7/9).
- Produces: a shared character board (24 cards) that removes a card in real time when any team picks it (via `onSnapshot`), a 15-second countdown per turn, and a pick button that writes a `create`-only doc to `draft_picks/{characterId}` (rejected client-side if it already exists, per the security rule).

- [ ] **Step 1–2: N/A — DOM/Firestore wiring; pick-contention logic already unit-tested in Task 9**

- [ ] **Step 3: Write the implementation**

```html
<!-- portal/public/draft.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Draft — Doomsday Algorithm</title>
  <link rel="stylesheet" href="shared/theme.css">
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
  <script src="shared/firebaseConfig.js"></script>
</head>
<body>
  <script src="shared/banner.js"></script>
  <script src="shared/nav.js"></script>
  <main style="max-width:1100px;margin:2rem auto;padding:0 1.5rem;">
    <h1 class="accent-red">Round 3 — Draft</h1>
    <div id="timer" style="font-size:1.5rem;font-weight:700;"></div>
    <div id="board" style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-top:1rem;"></div>
  </main>
  <script src="draft.js"></script>
</body>
</html>
```

```javascript
// portal/public/draft.js
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const teamId = localStorage.getItem('doomsday_team_id') || prompt('Team ID:');
localStorage.setItem('doomsday_team_id', teamId);

const CHARACTER_POOL = [
  'Tony Stark', 'Steve Rogers', 'Natasha Romanoff', 'Thor Odinson', 'Shuri',
  'Peter Parker', 'Stephen Strange', 'Carol Danvers', 'Peter Quill', 'Gamora',
  'Loki', 'Wanda Maximoff', 'Sam Wilson', 'Bucky Barnes', 'Kate Bishop',
  'Charles Xavier', 'Jean Grey', 'Logan', 'Victor von Doom', 'Hela',
  'Nick Fury', 'Okoye', 'Valkyrie', 'Wong',
]; // must match the 24-character pool committed to the answer key at build time

function renderBoard(takenMap) {
  const board = document.getElementById('board');
  board.innerHTML = '';
  CHARACTER_POOL.forEach(name => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const card = document.createElement('div');
    card.className = 'panel';
    const taken = takenMap[id];
    card.innerHTML = `<strong>${name}</strong><br>${taken ? `<span class="accent-red">Picked by ${taken}</span>` : ''}`;
    if (!taken) {
      const btn = document.createElement('button');
      btn.textContent = 'Draft';
      btn.addEventListener('click', () => {
        // characterName (the real name, e.g. "Shuri") travels alongside the
        // slugified doc ID because Task 9's revealPhase5 looks up draft
        // outcomes in the answer key by real name, not by slug.
        db.collection('draft_picks').doc(id).set({ teamId, characterId: id, characterName: name, pickedAt: Date.now() })
          .catch(() => alert('Someone just took this character.'));
      });
      card.appendChild(btn);
    }
    board.appendChild(card);
  });
}

db.collection('draft_picks').onSnapshot(snap => {
  const takenMap = {};
  snap.forEach(doc => { takenMap[doc.id] = doc.data().teamId; });
  renderBoard(takenMap);
});

let secondsLeft = 15;
setInterval(() => {
  secondsLeft = secondsLeft > 0 ? secondsLeft - 1 : 15;
  document.getElementById('timer').textContent = `${secondsLeft}s`;
}, 1000);
```

- [ ] **Step 4: Manual verification**

With the emulator running, use the browse skill in two tabs (`$B newtab` for a second simulated team): pick a character in tab 1, `$B tab <id2>` then `$B snapshot -D` on tab 2 to confirm the card now shows "Picked by team1" without a manual refresh.

- [ ] **Step 5: Commit**

```bash
git add portal/public/draft.html portal/public/draft.js
git commit -m "feat: live draft board with real-time pick sync and countdown timer"
```

---

### Task 14: Report page

**Files:**
- Create: `portal/public/report.html`
- Create: `portal/public/report.js`

**Interfaces:**
- Consumes: `submissions` collection (Task 12) filtered by the current team, sorted by confidence distance from 50 (most confident first) to auto-select the "3 boldest predictions" per spec §8.
- Produces: a form with 3 auto-filled prediction summaries, each with two text fields (chart/number cited, trap noticed), submitting to a new `reports/{teamId}` document.

- [ ] **Step 1–2: N/A — form wiring, no standalone scoring logic here (judging is manual, Task 15)**

- [ ] **Step 3: Write the implementation**

```html
<!-- portal/public/report.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Report — Doomsday Algorithm</title>
  <link rel="stylesheet" href="shared/theme.css">
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
  <script src="shared/firebaseConfig.js"></script>
</head>
<body>
  <script src="shared/banner.js"></script>
  <script src="shared/nav.js"></script>
  <main style="max-width:800px;margin:2rem auto;padding:0 1.5rem;">
    <h1 class="accent-green">Round 4 — Justify your top 3</h1>
    <div id="report-form"></div>
    <button id="submit-report">Submit report</button>
  </main>
  <script src="report.js"></script>
</body>
</html>
```

```javascript
// portal/public/report.js
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const teamId = localStorage.getItem('doomsday_team_id');

async function loadTopThree() {
  const snap = await db.collection('submissions').where('teamId', '==', teamId).get();
  const subs = [];
  snap.forEach(doc => subs.push(doc.data()));
  subs.sort((a, b) => Math.abs((b.probabilities.yes || 50) - 50) - Math.abs((a.probabilities.yes || 50) - 50));
  const top3 = subs.slice(0, 3);

  const form = document.getElementById('report-form');
  top3.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'panel';
    div.style.marginBottom = '1rem';
    div.innerHTML = `
      <p>Prediction ${i + 1}: question <code>${s.questionId}</code> at ${s.probabilities.yes}%</p>
      <label>Chart/number that backs it:<br><textarea id="chart-${i}" rows="2" style="width:100%;"></textarea></label>
      <label>Trap noticed (if any) and how you handled it:<br><textarea id="trap-${i}" rows="2" style="width:100%;"></textarea></label>
    `;
    form.appendChild(div);
  });

  document.getElementById('submit-report').addEventListener('click', () => {
    const entries = top3.map((s, i) => ({
      questionId: s.questionId,
      chartJustification: document.getElementById(`chart-${i}`).value,
      trapNote: document.getElementById(`trap-${i}`).value,
    }));
    db.collection('reports').doc(teamId).set({ teamId, entries, submittedAt: Date.now() });
  });
}

loadTopThree();
```

- [ ] **Step 4: Manual verification**

With the emulator seeded with a few `submissions` docs for a test team, use the browse skill: `$B goto file://<abs>/portal/public/report.html`, confirm 3 prediction blocks render pre-filled with question IDs and percentages, fill the text areas, submit, then check the emulator UI shows a new `reports/{teamId}` document.

- [ ] **Step 5: Commit**

```bash
git add portal/public/report.html portal/public/report.js
git commit -m "feat: report page auto-filled from team's boldest Round 2 predictions"
```

---

### Task 15: Judge queue page

**Files:**
- Create: `portal/public/judge.html`
- Create: `portal/public/judge.js`

**Interfaces:**
- Consumes: `reports` collection (Task 14). Point values must exactly match `Doomsday_Algorithm_Judging_Checklist.docx`.
- Produces: a blind queue (team names never rendered, only Firestore doc ID relabeled as "Report #N" in display order, not the real team ID) presenting one report at a time with the 4-category tick-box checklist, writing to `judge_scores/{judgeId}_{reportId}` on submit, then auto-advancing.

- [ ] **Step 1–2: N/A — UI wiring over an already-fixed point schema**

- [ ] **Step 3: Write the implementation**

```html
<!-- portal/public/judge.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Judge Queue — Doomsday Algorithm</title>
  <link rel="stylesheet" href="shared/theme.css">
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
  <script src="shared/firebaseConfig.js"></script>
</head>
<body>
  <script src="shared/banner.js"></script>
  <main style="max-width:800px;margin:2rem auto;padding:0 1.5rem;">
    <h1 class="accent-red">Judge Queue</h1>
    <div id="judge-id-prompt" class="panel">
      <label>Judge ID: <input id="judge-id-input"></label>
      <button id="judge-id-save">Start</button>
    </div>
    <div id="report-view" style="display:none;"></div>
  </main>
  <script src="judge.js"></script>
</body>
</html>
```

```javascript
// portal/public/judge.js
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const CATEGORIES = [
  { key: 'dataSoph', label: 'Data Sophistication', max: 25, checks: [
    { label: 'Combined more than one data table', pts: 10 },
    { label: 'Used a real statistic, not a raw number', pts: 10 },
    { label: 'Method shown matches the claim', pts: 5 },
  ]},
  { key: 'logicEvidence', label: 'Logic & Evidence', max: 25, checks: [
    { label: 'Prediction 1 cites a chart/number', pts: 5 },
    { label: 'Prediction 2 cites a chart/number', pts: 5 },
    { label: 'Prediction 3 cites a chart/number', pts: 5 },
    { label: 'Caught a planted trap', pts: 10 },
  ]},
  { key: 'visualization', label: 'Visualization', max: 25, checks: [
    { label: 'At least one chart included', pts: 10 },
    { label: 'Chart is readable', pts: 10 },
    { label: 'Chart supports the claim beside it', pts: 5 },
  ]},
  { key: 'communication', label: 'Communication', max: 25, checks: [
    { label: 'Fits the length limit', pts: 5 },
    { label: 'A stranger follows it in under a minute', pts: 10 },
    { label: 'States confidence and reasoning together', pts: 10 },
  ]},
];

let judgeId, queue = [], currentIndex = 0;

document.getElementById('judge-id-save').addEventListener('click', async () => {
  judgeId = document.getElementById('judge-id-input').value.trim();
  if (!judgeId) return;
  document.getElementById('judge-id-prompt').style.display = 'none';
  document.getElementById('report-view').style.display = 'block';
  const snap = await db.collection('reports').get();
  queue = [];
  snap.forEach(doc => queue.push({ id: doc.id, ...doc.data() }));
  renderCurrent();
});

function renderCurrent() {
  const view = document.getElementById('report-view');
  if (currentIndex >= queue.length) {
    view.innerHTML = '<p>Queue complete.</p>';
    return;
  }
  const report = queue[currentIndex];
  view.innerHTML = `<h2>Report #${currentIndex + 1} of ${queue.length}</h2>` +
    report.entries.map(e => `<p><strong>${e.questionId}</strong>: ${e.chartJustification} — trap: ${e.trapNote}</p>`).join('') +
    CATEGORIES.map(cat => `
      <div class="panel" style="margin:0.5rem 0;">
        <strong>${cat.label} (/${cat.max})</strong><br>
        ${cat.checks.map((c, i) => `
          <label><input type="checkbox" data-cat="${cat.key}" data-pts="${c.pts}"> ${c.label} (+${c.pts})</label><br>
        `).join('')}
      </div>
    `).join('') +
    `<button id="submit-judge">Submit and next</button>`;

  document.getElementById('submit-judge').addEventListener('click', () => {
    const totals = {};
    CATEGORIES.forEach(cat => totals[cat.key] = 0);
    view.querySelectorAll('input[type=checkbox]:checked').forEach(box => {
      totals[box.dataset.cat] += Number(box.dataset.pts);
    });
    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    // Firestore rules (Task 7) forbid any client write to `leaderboard` —
    // this collection only accepts create, and the onJudgeScoreCreate
    // trigger (Task 9) reads every judge_scores doc for this reportId and
    // writes the averaged reportRaw into leaderboard server-side.
    db.collection('judge_scores').doc(`${judgeId}_${report.id}`).set({
      judgeId, reportId: report.id, teamId: report.teamId, totals, total, judgedAt: Date.now(),
    });
    currentIndex++;
    renderCurrent();
  });
}
```

- [ ] **Step 4: Manual verification**

With 2–3 seeded `reports` docs and the Cloud Functions emulator running (so `onJudgeScoreCreate` from Task 9 fires), use the browse skill: `$B goto file://<abs>/portal/public/judge.html`, enter a judge ID, `$B snapshot -i` to find checkbox refs, tick a few, submit, confirm it advances to "Report #2 of 3" and that `leaderboard/{teamId}.reportRaw` updates in the emulator UI shortly after (via the trigger, not a direct client write).

- [ ] **Step 5: Commit**

```bash
git add portal/public/judge.html portal/public/judge.js
git commit -m "feat: blind judge queue with tick-box checklist matching official rubric"
```

---

### Task 16: Admin / projector leaderboard page

**Files:**
- Create: `portal/public/admin.html`
- Create: `portal/public/admin.js`

**Interfaces:**
- Consumes: `combineLeaderboard`, `rankTeams` from `portal/shared/leaderboard.js` (Task 6), `leaderboard` collection (all three raw score fields).
- Produces: a full-screen projector view showing the combined, weighted, ranked leaderboard, live-updating; an admin-only "Reveal Phase 5" button that calls the `revealPhase5` callable function (Task 9).

- [ ] **Step 1–2: N/A — combination math already unit-tested in Task 6**

- [ ] **Step 3: Write the implementation**

```html
<!-- portal/public/admin.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Leaderboard — Doomsday Algorithm</title>
  <link rel="stylesheet" href="shared/theme.css">
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-functions-compat.js"></script>
  <script src="shared/firebaseConfig.js"></script>
  <script src="../../shared/leaderboard.js"></script>
</head>
<body>
  <script src="shared/banner.js"></script>
  <main style="max-width:1100px;margin:2rem auto;padding:0 1.5rem;">
    <h1 class="accent-red">Live Leaderboard</h1>
    <button id="reveal-btn">Reveal Phase 5</button>
    <table id="board" style="width:100%;margin-top:1rem;font-size:1.2rem;"></table>
  </main>
  <script src="admin.js"></script>
</body>
</html>
```

```javascript
// portal/public/admin.js
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const functions = firebase.functions();

document.getElementById('reveal-btn').addEventListener('click', async () => {
  const revealPhase5 = functions.httpsCallable('revealPhase5');
  const result = await revealPhase5();
  alert(`Scored ${result.data.teamsScored} teams.`);
});

db.collection('leaderboard').onSnapshot(snap => {
  const teams = [];
  snap.forEach(doc => {
    const d = doc.data();
    const predictPct = Math.min(100, (d.predictRaw || 0) / 15); // ~15-20 questions, 100pts max each
    const draftPct = ((d.draftRaw || 0) / 195) * 100;
    const reportPct = d.reportRaw || 0;
    const combined = combineLeaderboard(predictPct, draftPct, reportPct);
    teams.push({ id: doc.id, ...combined, predictRaw: d.predictRaw || 0, submittedAt: d.lastSubmittedAt || 0 });
  });
  const ranked = rankTeams(teams);
  document.getElementById('board').innerHTML =
    '<tr><th>Rank</th><th>Team</th><th>Total</th><th>Predict</th><th>Draft</th><th>Report</th></tr>' +
    ranked.map((t, i) => `<tr><td>${i + 1}</td><td>${t.id}</td><td>${t.total}</td><td>${t.predictPct.toFixed(0)}%</td><td>${t.draftPct.toFixed(0)}%</td><td>${t.reportPct.toFixed(0)}%</td></tr>`).join('');
});
```

- [ ] **Step 4: Manual verification**

With the emulator running and `leaderboard` docs seeded for 2+ teams (varying `predictRaw`/`draftRaw`/`reportRaw`), use the browse skill: `$B goto file://<abs>/portal/public/admin.html`, confirm the table renders ranked correctly matching `rankTeams` order, click "Reveal Phase 5", confirm the alert shows a team count from the emulator's `revealPhase5` callable.

- [ ] **Step 5: Commit**

```bash
git add portal/public/admin.html portal/public/admin.js
git commit -m "feat: projector leaderboard combining all three rounds with reveal control"
```

---

## Self-Review Notes

**Spec coverage:** §1 (why redesign) → Task 1–3's counterfactual model and traps. §2 (Earth-4471 concept) → Task 1's `REAL_CHARACTER_NAMES` + Task 10's banner. §3 (dataset) → Tasks 1–4. §4 (BYOT coding) → no in-portal code runner exists anywhere in this plan (by omission, correctly). §5 (event timeline) → `config/event.json` in Task 11; round open/close controls are a gap — **added as a follow-up**: Task 16's admin page should also gate `submissions`/`draft_picks` writes by round-open flags in `reveal_state`, not just handle the reveal button. Flagging this as a known gap for a fast-follow task rather than expanding this plan further. §6 (Brier scoring) → Task 5, Task 8. §7 (draft) → Task 6, Task 9, Task 13. §8 (report + judging) → Task 14, Task 15. §9 (leaderboard weights/tie-break) → Task 6, Task 16. §10 (portal architecture) → Task 7 (backend), Tasks 10–16 (frontend). §12 (preserved visual theme) → Task 10.

**Placeholder scan:** no TBD/TODO in any task's code. `firebaseConfig.js`'s `REPLACE_ME` values are an intentional, documented exception — they require the user's own Firebase project credentials, which cannot be fabricated in this plan.

**Type consistency:** `brierScore(p, actualYes)` signature is identical in Task 5's implementation, Task 8's `computeSubmissionScore`, and Task 8's test. `draftCharacterScore(outcome)` / `draftTeamScore(characterOutcomes)` signatures match across Task 6 and Task 9's `revealPhase5.js`. `combineLeaderboard(predictPct, draftPct, reportPct)` and `rankTeams(teams)` match across Task 6 and Task 16's `admin.js`.

**Known gap flagged, not silently dropped:** round-open/close enforcement (submissions rejected outside the 0:45–2:15 window, draft picks rejected outside 2:30–3:00) is not implemented in this plan — Firestore rules and Cloud Functions here allow submission at any time. This is a real gap for the live event and should be a fast-follow task once this plan ships, using the `reveal_state`/round-flag pattern already established in Task 9.

**Preflight fixes applied 2026-09-08 (see controller ledger for full rulings):** the version of this plan actually executed differs from the first draft in five places, all corrected before Task 1 was dispatched — (1) Task 1/2's survivorship-bias trap was probabilistic, not structural, and would very likely fail (`future_debut` field added, 10 characters structurally reserved out of Phases 1–4); (2) Task 9's `revealPhase5` depended on an `answerKey.characterOutcomes` map that no task produced (added to Task 3's `generate_phase5` and Task 4's build/test); (3) Task 7's `submissions` rule required `request.auth.uid` with no Authentication task anywhere in the plan, which would reject every real client write (rule rewritten to validate document shape instead, on the recorded judgment that team-identity spoofing is out of this spec's threat model); (4) Task 15's `judge.js` wrote directly to `leaderboard`, which Task 7's own rules forbid from clients (added `onJudgeScoreCreate` trigger in Task 9, added a matching `judge_scores` rule, removed the direct write); (5) the draft-outcome lookup in `revealPhase5` keyed by the slugified `draft_picks` doc ID against a `characterOutcomes` map keyed by real character name — an always-miss (Task 13's `draft.js` now also writes `characterName`, and the lookup uses that field).
