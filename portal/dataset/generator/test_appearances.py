import unittest
from entities import generate_films, generate_characters
from appearances import generate_appearances, generate_co_appearances, generate_post_credits

class TestAppearances(unittest.TestCase):
    def setUp(self):
        self.films = generate_films(seed=42)
        self.characters = generate_characters(seed=42)

    def test_appearances_have_required_fields(self):
        apps = generate_appearances(self.films, self.characters, seed=42)
        self.assertGreater(len(apps), 0)
        for a in apps[:5]:
            for key in ("character", "film", "screentime_min", "dialogue_lines",
                        "billing_order", "final_billing_position", "survived"):
                self.assertIn(key, a)

    def test_future_debut_characters_never_appear_in_phases_1_to_4(self):
        apps = generate_appearances(self.films, self.characters, seed=42)
        appeared_names = {a["character"] for a in apps}
        reserved_names = {c["name"] for c in self.characters if c["future_debut"]}
        self.assertEqual(appeared_names & reserved_names, set())

    def test_dead_characters_do_not_reappear_in_later_films(self):
        apps = generate_appearances(self.films, self.characters, seed=42)
        film_order = {f["name"]: (f["phase"], i) for i, f in enumerate(self.films)}
        death_film_index = {}
        for a in sorted(apps, key=lambda x: film_order[x["film"]][1]):
            idx = film_order[a["film"]][1]
            if a["character"] in death_film_index:
                self.assertGreater(idx, death_film_index[a["character"]],
                    f"{a['character']} appears after their death")
            if not a["survived"]:
                death_film_index.setdefault(a["character"], idx)

    def test_co_appearances_only_reference_shared_films(self):
        apps = generate_appearances(self.films, self.characters, seed=42)
        co = generate_co_appearances(apps, seed=42)
        cast_by_film = {}
        for a in apps:
            cast_by_film.setdefault(a["film"], set()).add(a["character"])
        for row in co:
            self.assertIn(row["character_a"], cast_by_film[row["film"]])
            self.assertIn(row["character_b"], cast_by_film[row["film"]])

    def test_post_credits_reference_real_films(self):
        apps = generate_appearances(self.films, self.characters, seed=42)
        film_names = {f["name"] for f in self.films}
        pc = generate_post_credits(self.films, self.characters, seed=42)
        for row in pc:
            self.assertIn(row["film"], film_names)
            self.assertIn(row["paid_off_in_film"], film_names)

if __name__ == "__main__":
    unittest.main()
