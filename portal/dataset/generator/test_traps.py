import unittest
from entities import generate_films, generate_characters
from appearances import generate_appearances
from phase5 import generate_phase5
from traps import verify_simpsons_paradox, verify_survivorship_gap, verify_leaky_column

class TestTraps(unittest.TestCase):
    def setUp(self):
        self.films = generate_films(seed=42)
        self.characters = generate_characters(seed=42)
        self.appearances = generate_appearances(self.films, self.characters, seed=42)

    def test_simpsons_paradox_present(self):
        self.assertTrue(verify_simpsons_paradox(self.films, self.appearances))

    def test_survivorship_gap_present(self):
        self.assertTrue(verify_survivorship_gap(self.characters, self.appearances))

    def test_leaky_column_present_in_history_absent_in_future(self):
        phase5 = generate_phase5(self.characters, seed=42)
        self.assertTrue(verify_leaky_column(self.appearances, phase5["appearances"]))

    def test_phase5_has_7_films_and_is_deterministic(self):
        p5a = generate_phase5(self.characters, seed=99)
        p5b = generate_phase5(self.characters, seed=99)
        self.assertEqual(len(p5a["films"]), 7)
        self.assertEqual(p5a, p5b)

    def test_character_outcomes_shape_matches_draft_scoring_contract(self):
        p5 = generate_phase5(self.characters, seed=42)
        appeared = {a["character"] for a in p5["appearances"]}
        self.assertEqual(set(p5["characterOutcomes"].keys()), appeared)
        for outcome in p5["characterOutcomes"].values():
            self.assertIn("survived", outcome)
            self.assertIn("topThirdScreentime", outcome)
            self.assertIn("hadTeamUp", outcome)

    def test_phase5_characters_do_not_reappear_after_death(self):
        # A character sampled independently per film with no cross-film
        # death tracking could die in one Phase 5 film and be cast normally
        # in a later one, producing a contradictory characterOutcomes entry
        # (whichever appearance is processed last silently wins). This test
        # asserts death is permanent across Phase 5's own films, the same
        # property Task 2 already enforces across Phases 1-4.
        p5 = generate_phase5(self.characters, seed=42)
        film_order = {f["name"]: i for i, f in enumerate(p5["films"])}
        apps_sorted = sorted(p5["appearances"], key=lambda a: film_order[a["film"]])
        dead = set()
        for a in apps_sorted:
            self.assertNotIn(a["character"], dead,
                f"{a['character']} appears in {a['film']} after already being marked dead")
            if not a["survived"]:
                dead.add(a["character"])

if __name__ == "__main__":
    unittest.main()
