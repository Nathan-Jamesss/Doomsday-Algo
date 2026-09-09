import statistics

def verify_simpsons_paradox(films, appearances):
    # Verify against per-film TOTAL screentime summed from appearances.csv —
    # the actual number a participant computes — not the internal
    # _screentime_deviation field, which never reached the shipped data in
    # an earlier version of this generator (a real bug caught in final
    # review: the trap existed internally but was invisible to teams).
    screentime_by_film = {}
    for a in appearances:
        screentime_by_film[a["film"]] = screentime_by_film.get(a["film"], 0) + a["screentime_min"]

    pooled_screentime = [screentime_by_film.get(f["name"], 0) for f in films]
    pooled_gross = [f["worldwide_gross_m"] for f in films]
    pooled_corr = statistics.correlation(pooled_screentime, pooled_gross)

    within_phase_positive = True
    by_phase = {}
    for f in films:
        by_phase.setdefault(f["phase"], []).append(f)
    for phase_films in by_phase.values():
        st = [screentime_by_film.get(f["name"], 0) for f in phase_films]
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
