from model import build_rng, FACTIONS

# Bumped back up from 5/3/2/2 (12 total) to 10/6/4/4 (24 total) -- the event
# moved from a strict 15-20 minute drop-in to a real 2.5-3 hour session
# (organizer's explicit call, accepting that very late arrivals may not
# finish inside the 12-6 window). Same 4 question types, just more of each.
SURVIVAL_COUNT = 10
TEAMUP_COUNT = 6
PARTNER_COUNT = 4
SCREENTIME_COUNT = 4

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
        correct_option = options[0]
        # Shuffle AFTER capturing the correct option, not before — an
        # unshuffled options list always put the correct answer first,
        # a positional bias teams would spot after a couple of questions
        # (caught in final review).
        rng.shuffle(options)
        qid = new_id()
        questions.append({"id": qid, "type": "multichoice", "options": options,
            "text": f"Which character does {name} share the most scenes with in Phase 5?"})
        answers[qid] = {"correctOption": correct_option}
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

# Explore round: a new pre-Predict round added when the event grew from a
# 15-20 minute drop-in to a real 2.5-3 hour session. Every answer here comes
# from the PUBLIC Phases 1-4 CSVs the team already downloaded, computed
# deterministically at build time -- unlike Predict, nothing here depends on
# the hidden Phase 5 data. Its purpose is to force an actual look at the
# dataset (joins, sums, lookups) before Predict, not to test the same
# forecasting skill twice.
FILM_GROSS_COMPARE_COUNT = 2
SURVIVED_ALL_COUNT = 2
TOP_SCREENTIME_COUNT = 2
FACTION_LOOKUP_COUNT = 2
POST_CREDITS_COUNT = 2

def generate_explore_questions_and_answers(films, characters, appearances, co_appearances, post_credits, seed):
    rng = build_rng(seed + 21000)

    questions = []
    answers = {}
    next_id = 1

    def new_id():
        nonlocal next_id
        qid = f"e{next_id}"
        next_id += 1
        return qid

    screentime_by_char = {}
    appearance_count_by_char = {}
    survived_all_by_char = {}
    for a in appearances:
        name = a["character"]
        screentime_by_char[name] = screentime_by_char.get(name, 0) + a["screentime_min"]
        appearance_count_by_char[name] = appearance_count_by_char.get(name, 0) + 1
        survived_all_by_char[name] = survived_all_by_char.get(name, True) and a["survived"]
    appeared_names = sorted(appearance_count_by_char.keys())

    # 1. Film worldwide gross comparison (films.csv)
    film_pairs = [(a, b) for i, a in enumerate(films) for b in films[i + 1:]]
    rng.shuffle(film_pairs)
    made = 0
    for film_a, film_b in film_pairs:
        if made >= FILM_GROSS_COMPARE_COUNT:
            break
        if film_a["worldwide_gross_m"] == film_b["worldwide_gross_m"]:
            continue
        qid = new_id()
        questions.append({"id": qid, "type": "yesno",
            "text": f"Did {film_a['name']} earn a higher worldwide gross than {film_b['name']} (Phases 1-4)?"})
        answers[qid] = {"actualYes": film_a["worldwide_gross_m"] > film_b["worldwide_gross_m"]}
        made += 1

    # 2. Did a character survive every Phase 1-4 film they appeared in? (appearances.csv)
    candidates = list(appeared_names)
    rng.shuffle(candidates)
    for name in candidates[:SURVIVED_ALL_COUNT]:
        qid = new_id()
        questions.append({"id": qid, "type": "yesno",
            "text": f"Did {name} survive every Phase 1-4 film they appeared in?"})
        answers[qid] = {"actualYes": survived_all_by_char[name]}

    # 3. Top total screentime among 4 characters (appearances.csv)
    pool = list(appeared_names)
    rng.shuffle(pool)
    made = 0
    i = 0
    while made < TOP_SCREENTIME_COUNT and i + 4 <= len(pool):
        group = pool[i:i + 4]
        i += 4
        totals = sorted((screentime_by_char[n] for n in group), reverse=True)
        if totals[0] == totals[1]:  # ambiguous tie for first place -- skip this group
            continue
        correct = max(group, key=lambda n: screentime_by_char[n])
        options = list(group)
        rng.shuffle(options)
        qid = new_id()
        questions.append({"id": qid, "type": "multichoice", "options": options,
            "text": "Which of these characters has the most total screentime across Phases 1-4?"})
        answers[qid] = {"correctOption": correct}
        made += 1

    # 4. Faction lookup (characters.csv / roster.csv)
    char_pool = list(characters)
    rng.shuffle(char_pool)
    for c in char_pool[:FACTION_LOOKUP_COUNT]:
        distractors = [f for f in FACTIONS if f != c["faction"]]
        rng.shuffle(distractors)
        options = [c["faction"]] + distractors[:3]
        rng.shuffle(options)
        qid = new_id()
        questions.append({"id": qid, "type": "multichoice", "options": options,
            "text": f"Which faction is {c['name']} in?"})
        answers[qid] = {"correctOption": c["faction"]}

    # 5. Post-credits teaser lookup (post_credits.csv)
    all_names = [c["name"] for c in characters]
    pc_pool = list(post_credits)
    rng.shuffle(pc_pool)
    made = 0
    for row in pc_pool:
        if made >= POST_CREDITS_COUNT:
            break
        correct = row["character_teased"]
        distractor_pool = [n for n in all_names if n != correct]
        if len(distractor_pool) < 3:
            continue
        rng.shuffle(distractor_pool)
        options = [correct] + distractor_pool[:3]
        rng.shuffle(options)
        qid = new_id()
        questions.append({"id": qid, "type": "multichoice", "options": options,
            "text": f"Who was teased in {row['film']}'s post-credits scene?"})
        answers[qid] = {"correctOption": correct}
        made += 1

    return questions, answers

def generate_draft_pool(phase5, team_count, seed):
    # The draft board can only offer characters who actually have a
    # characterOutcomes entry — anyone else scores a guaranteed 0 with no
    # way to know it in advance (caught in final review, 6/24 of the
    # original hardcoded pool had no Phase 5 outcome at all). Pool size is
    # capped at however many such characters actually exist; a team count
    # beyond that means some teams draft nothing this round, an inherent
    # limit of a fixed-roster exclusive draft, not a bug to paper over.
    rng = build_rng(seed + 13000)
    eligible = sorted(phase5["characterOutcomes"].keys())
    rng.shuffle(eligible)
    return eligible[:min(team_count, len(eligible))]
