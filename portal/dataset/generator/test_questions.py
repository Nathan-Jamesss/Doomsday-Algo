import unittest
from entities import generate_films, generate_characters
from appearances import generate_appearances
from phase5 import generate_phase5
from questions import generate_questions_and_answers

class TestQuestions(unittest.TestCase):
    def setUp(self):
        films = generate_films(seed=42)
        characters = generate_characters(seed=42)
        generate_appearances(films, characters, seed=42)  # not used directly; phase5 is self-contained
        self.phase5 = generate_phase5(characters, seed=42)

    def test_generates_at_least_15_questions_each_with_an_answer(self):
        questions, answers = generate_questions_and_answers(self.phase5, seed=42)
        self.assertGreaterEqual(len(questions), 15)
        self.assertEqual(len(questions), len(answers))

    def test_every_question_id_has_a_correctly_shaped_answer(self):
        questions, answers = generate_questions_and_answers(self.phase5, seed=42)
        for q in questions:
            self.assertIn(q["id"], answers)
            if q["type"] == "yesno":
                self.assertIn("actualYes", answers[q["id"]])
                self.assertIsInstance(answers[q["id"]]["actualYes"], bool)
            else:
                self.assertEqual(q["type"], "multichoice")
                self.assertIn("options", q)
                self.assertIn("correctOption", answers[q["id"]])
                self.assertIn(answers[q["id"]]["correctOption"], q["options"])

    def test_deterministic_for_same_seed(self):
        q1, a1 = generate_questions_and_answers(self.phase5, seed=42)
        q2, a2 = generate_questions_and_answers(self.phase5, seed=42)
        self.assertEqual(q1, q2)
        self.assertEqual(a1, a2)

    def test_multichoice_options_are_never_duplicated(self):
        # Phase 5 has 7 films, so the same two characters can co-appear in
        # more than one — without deduping by partner name, a multichoice
        # question's options could silently repeat the same visible choice.
        # Sweep a range of seeds since this bug only manifests for some.
        for seed in range(1, 60):
            films = generate_films(seed=seed)
            characters = generate_characters(seed=seed)
            phase5 = generate_phase5(characters, seed=seed)
            questions, _ = generate_questions_and_answers(phase5, seed=seed)
            for q in questions:
                if q["type"] == "multichoice":
                    self.assertEqual(len(q["options"]), len(set(q["options"])),
                        f"seed={seed} question={q['id']} has duplicate options: {q['options']}")

    def test_multichoice_correct_option_is_not_always_first(self):
        # An unshuffled options list always put the correct answer at
        # index 0 — a positional bias solvable without reading any data.
        # Sweep seeds and confirm the correct option's position varies.
        positions = []
        for seed in range(1, 60):
            characters = generate_characters(seed=seed)
            phase5 = generate_phase5(characters, seed=seed)
            questions, answers = generate_questions_and_answers(phase5, seed=seed)
            for q in questions:
                if q["type"] == "multichoice":
                    positions.append(q["options"].index(answers[q["id"]]["correctOption"]))
        self.assertGreater(len(positions), 0)
        self.assertGreater(len(set(positions)), 1,
            f"correct option position never varies across seeds: {positions}")

if __name__ == "__main__":
    unittest.main()
