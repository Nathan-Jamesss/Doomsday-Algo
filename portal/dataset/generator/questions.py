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
