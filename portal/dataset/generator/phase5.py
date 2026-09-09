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
        pairs = [(cast[i], cast[j]) for i in range(len(cast)) for j in range(i + 1, len(cast))]
        rng.shuffle(pairs)
        # At most ONE genuine team-up pair per film. A per-pair probability
        # alone doesn't work here: characters accumulate exposure across
        # multiple Phase 5 films, so even a low per-pair rate saturates to
        # near-universal coverage once summed — verified empirically
        # (41/43 characters still flagged hadTeamUp at a 15% per-pair rate).
        # Capping absolutely at 1 per film bounds total coverage to at most
        # 14 of ~43 characters across all 7 films.
        if pairs:
            a_name, b_name = pairs[0]
            co_appearances.append({
                "character_a": a_name, "character_b": b_name,
                "film": film, "shared_scenes": rng.randint(2, 6),
            })
        # A few incidental single-scene pairings for data richness — never
        # reach the shared_scenes >= 2 team-up threshold.
        for a_name, b_name in pairs[1:4]:
            if rng.random() > 0.5:
                co_appearances.append({
                    "character_a": a_name, "character_b": b_name,
                    "film": film, "shared_scenes": 1,
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

    # Spec §7: "team-up (2+ co-appearances)" — require shared_scenes >= 2,
    # not merely the existence of any row, or every character with even one
    # incidental shared scene counts (caught in final review: this made
    # hadTeamUp constant across the entire roster).
    teamed_up_characters = set()
    for row in co_appearances:
        if row["shared_scenes"] >= 2:
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
