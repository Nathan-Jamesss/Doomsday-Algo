import unittest
import statistics
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
        self.assertTrue(verify_simpsons_paradox(self.films))

    def test_survivorship_gap_present(self):
        self.assertTrue(verify_survivorship_gap(self.characters, self.appearances))

    def test_leaky_column_present_in_history_absent_in_future(self):
        self.assertTrue(verify_leaky_column(self.appearances))
        phase5 = generate_phase5(self.characters, seed=42)
        for row in phase5["appearances"]:
            self.assertNotIn("final_billing_position", row)

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

if __name__ == "__main__":
    unittest.main()
