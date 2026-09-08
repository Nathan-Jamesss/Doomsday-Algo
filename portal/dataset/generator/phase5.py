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

    pool = list(characters)
    rng.shuffle(pool)
    appearances = []
    for film in films:
        cast = rng.sample(pool, min(CAST_SIZE_PER_FILM, len(pool)))
        cast_sorted = sorted(cast, key=lambda c: -c["centrality"])
        for order, c in enumerate(cast_sorted, start=1):
            base_screentime = 30 * (c["centrality"] + 0.2)
            screentime = round(max(1.0, base_screentime + rng.uniform(-5, 5)), 1)
            hazard = 0.12 * (1 - c["centrality"])
            appearances.append({
                "character": c["name"],
                "film": film["name"],
                "screentime_min": screentime,
                "dialogue_lines": int(max(0, screentime * rng.uniform(2.0, 4.0))),
                "billing_order": order,
                "survived": rng.random() > hazard,
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
