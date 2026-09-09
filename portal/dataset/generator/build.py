import argparse, csv, json, os
from entities import generate_films, generate_characters
from appearances import generate_appearances, generate_co_appearances, generate_post_credits
from phase5 import generate_phase5
from questions import generate_questions_and_answers, generate_draft_pool
from traps import verify_simpsons_paradox, verify_survivorship_gap, verify_leaky_column

def _write_csv(path, rows, fields):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

def build_dataset(seed, public_dir, private_dir, team_count=55):
    films = generate_films(seed)
    characters = generate_characters(seed)
    appearances = generate_appearances(films, characters, seed)
    co_appearances = generate_co_appearances(appearances, seed)
    post_credits = generate_post_credits(films, appearances, seed)
    phase5 = generate_phase5(characters, seed)
    questions, question_answers = generate_questions_and_answers(phase5, seed)
    draft_pool = generate_draft_pool(phase5, team_count, seed)

    assert verify_simpsons_paradox(films, appearances), "Simpson's paradox trap failed — tune generation coefficients"
    assert verify_survivorship_gap(characters, appearances), "survivorship trap failed"
    assert verify_leaky_column(appearances, phase5["appearances"]), "leaky column trap failed"

    # public_dir and private_dir are intentionally separate parameters, not
    # subdirectories of one shared output root — an organizer pointing a
    # single --out at the deployed web root would otherwise publish the
    # private answer key alongside the public dataset (a real deploy risk
    # caught in final review, not a hypothetical).
    _write_csv(os.path.join(public_dir, "films.csv"), films,
        ["name", "phase", "year", "budget_m", "opening_weekend_m", "worldwide_gross_m", "critic_score", "audience_score"])
    _write_csv(os.path.join(public_dir, "characters.csv"), characters,
        ["name", "faction", "first_film", "powered"])  # centrality excluded: it's the hidden latent variable driving survival/screentime, never meant to reach participants
    _write_csv(os.path.join(public_dir, "appearances.csv"), appearances,
        ["character", "film", "screentime_min", "dialogue_lines", "billing_order", "final_billing_position", "survived"])
    _write_csv(os.path.join(public_dir, "co_appearances.csv"), co_appearances,
        ["character_a", "character_b", "film", "shared_scenes"])
    _write_csv(os.path.join(public_dir, "post_credits.csv"), post_credits,
        ["film", "character_teased", "paid_off_in_film"])
    _write_csv(os.path.join(public_dir, "roster.csv"), characters,
        ["name", "faction", "powered"])
    os.makedirs(public_dir, exist_ok=True)
    with open(os.path.join(public_dir, "questions.json"), "w") as f:
        json.dump(questions, f, indent=2)
    with open(os.path.join(public_dir, "draft_pool.json"), "w") as f:
        json.dump(draft_pool, f, indent=2)

    os.makedirs(private_dir, exist_ok=True)
    answer_key = dict(phase5)
    answer_key.update(question_answers)  # flat-merge: q1, q2, ... alongside films/appearances/etc.
    with open(os.path.join(private_dir, "answer_key.json"), "w") as f:
        json.dump(answer_key, f, indent=2)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--public-out", default="./output/public",
        help="Directory for participant-facing files. For real deployment, point this at portal/public/data so the frontend's relative links resolve.")
    parser.add_argument("--private-out", default="./output/private",
        help="Directory for the answer key. NEVER point this inside a directory that gets deployed/served publicly.")
    parser.add_argument("--teams", type=int, default=55,
        help="Expected team count, sizes the draft pool (capped at however many Phase 5 characters actually exist).")
    args = parser.parse_args()
    build_dataset(args.seed, args.public_out, args.private_out, args.teams)
    print(f"Participant files written to {args.public_out}")
    print(f"Answer key written to {args.private_out} — do not deploy or distribute this directory")
