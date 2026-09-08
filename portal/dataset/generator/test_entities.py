import unittest
from entities import generate_films, generate_characters, ROSTER_SIZE, FILMS_PER_PHASE, PHASE_COUNT

class TestEntityGeneration(unittest.TestCase):
    def test_generates_28_films_across_4_phases(self):
        films = generate_films(seed=42)
        self.assertEqual(len(films), FILMS_PER_PHASE * PHASE_COUNT)
        phases = sorted(set(f["phase"] for f in films))
        self.assertEqual(phases, [1, 2, 3, 4])

    def test_generates_60_characters_with_required_fields(self):
        chars = generate_characters(seed=42)
        self.assertEqual(len(chars), ROSTER_SIZE)
        for c in chars:
            self.assertIn(c["faction"], {"Avengers", "X-Men", "Cosmic", "Villains", "Other"})
            self.assertTrue(0.0 <= c["centrality"] <= 1.0)
            self.assertIn(c["powered"], (True, False))
            self.assertIn(c["future_debut"], (True, False))

    def test_exactly_ten_characters_are_reserved_for_future_debut(self):
        from entities import FUTURE_DEBUT_COUNT
        chars = generate_characters(seed=42)
        reserved = [c for c in chars if c["future_debut"]]
        self.assertEqual(len(reserved), FUTURE_DEBUT_COUNT)

    def test_generation_is_deterministic_for_same_seed(self):
        self.assertEqual(generate_films(seed=7), generate_films(seed=7))
        self.assertEqual(generate_characters(seed=7), generate_characters(seed=7))

if __name__ == "__main__":
    unittest.main()
