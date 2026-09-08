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
