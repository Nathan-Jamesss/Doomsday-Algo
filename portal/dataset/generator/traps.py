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
