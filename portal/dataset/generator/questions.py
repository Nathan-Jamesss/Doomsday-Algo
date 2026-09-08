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

    co_by_char = {}
    for row in phase5["co_appearances"]:
        co_by_char.setdefault(row["character_a"], []).append((row["character_b"], row["shared_scenes"]))
        co_by_char.setdefault(row["character_b"], []).append((row["character_a"], row["shared_scenes"]))
    partner_candidates = [n for n in names if len(co_by_char.get(n, [])) >= 2]
    rng.shuffle(partner_candidates)
    made = 0
    for name in partner_candidates:
        if made >= PARTNER_COUNT:
            break
        partners = sorted(co_by_char[name], key=lambda p: -p[1])
        options = [p[0] for p in partners[:4]]
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
