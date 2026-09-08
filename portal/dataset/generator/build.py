import argparse, csv, json, os
from entities import generate_films, generate_characters
from appearances import generate_appearances, generate_co_appearances, generate_post_credits
from phase5 import generate_phase5
from questions import generate_questions_and_answers
from traps import verify_simpsons_paradox, verify_survivorship_gap, verify_leaky_column

def _write_csv(path, rows, fields):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

def build_dataset(seed, output_dir):
    films = generate_films(seed)
    characters = generate_characters(seed)
    appearances = generate_appearances(films, characters, seed)
    co_appearances = generate_co_appearances(appearances, seed)
    post_credits = generate_post_credits(films, appearances, seed)
    phase5 = generate_phase5(characters, seed)
    questions, question_answers = generate_questions_and_answers(phase5, seed)

    assert verify_simpsons_paradox(films), "Simpson's paradox trap failed — tune generation coefficients"
    assert verify_survivorship_gap(characters, appearances), "survivorship trap failed"
    assert verify_leaky_column(appearances, phase5["appearances"]), "leaky column trap failed"

    public = os.path.join(output_dir, "public")
    _write_csv(os.path.join(public, "films.csv"), films,
        ["name", "phase", "year", "budget_m", "opening_weekend_m", "worldwide_gross_m", "critic_score", "audience_score"])
    _write_csv(os.path.join(public, "characters.csv"), characters,
        ["name", "faction", "first_film", "powered", "centrality"])
    _write_csv(os.path.join(public, "appearances.csv"), appearances,
        ["character", "film", "screentime_min", "dialogue_lines", "billing_order", "final_billing_position", "survived"])
    _write_csv(os.path.join(public, "co_appearances.csv"), co_appearances,
        ["character_a", "character_b", "film", "shared_scenes"])
    _write_csv(os.path.join(public, "post_credits.csv"), post_credits,
        ["film", "character_teased", "paid_off_in_film"])
    _write_csv(os.path.join(public, "roster.csv"), characters,
        ["name", "faction", "powered"])
    with open(os.path.join(public, "questions.json"), "w") as f:
        json.dump(questions, f, indent=2)

    private = os.path.join(output_dir, "private")
    os.makedirs(private, exist_ok=True)
    answer_key = dict(phase5)
    answer_key.update(question_answers)  # flat-merge: q1, q2, ... alongside films/appearances/etc.
    with open(os.path.join(private, "answer_key.json"), "w") as f:
        json.dump(answer_key, f, indent=2)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", default="./output")
    args = parser.parse_args()
    build_dataset(args.seed, args.out)
    print(f"Dataset written to {args.out}/public (participant files) and {args.out}/private (answer key — do not distribute)")
