from model import build_rng

CAST_SIZE_PER_FILM = 10

def generate_appearances(films, characters, seed):
    rng = build_rng(seed)
    alive = {c["name"]: True for c in characters}
    by_faction = {}
    for c in characters:
        by_faction.setdefault(c["faction"], []).append(c)

    appearances = []
    films_sorted = sorted(films, key=lambda f: (f["phase"], f["name"]))
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

def generate_post_credits(films, characters, seed):
    rng = build_rng(seed)
    films_sorted = sorted(films, key=lambda f: (f["phase"], f["name"]))
    rows = []
    for i, film in enumerate(films_sorted[:-1]):
        later_films = films_sorted[i + 1:i + 4] or films_sorted[i + 1:]
        if not later_films:
            continue
        teased = rng.choice(characters)["name"]
        payoff = rng.choice(later_films)["name"]
        rows.append({
            "film": film["name"],
            "character_teased": teased,
            "paid_off_in_film": payoff,
        })
    return rows
