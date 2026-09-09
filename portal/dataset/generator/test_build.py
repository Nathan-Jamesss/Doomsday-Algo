import unittest, os, csv, json, shutil, tempfile
from build import build_dataset

class TestBuild(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.public_dir = os.path.join(self.tmp, "public")
        self.private_dir = os.path.join(self.tmp, "private")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_public_dir_has_no_phase5_data(self):
        build_dataset(seed=42, public_dir=self.public_dir, private_dir=self.private_dir)
        with open(os.path.join(self.public_dir, "films.csv")) as f:
            rows = list(csv.DictReader(f))
        phases = {row["phase"] for row in rows}
        self.assertEqual(phases, {"1", "2", "3", "4"})

    def test_private_answer_key_has_phase5_and_resolved_questions(self):
        build_dataset(seed=42, public_dir=self.public_dir, private_dir=self.private_dir)
        with open(os.path.join(self.private_dir, "answer_key.json")) as f:
            key = json.load(f)
        self.assertEqual(len(key["films"]), 7)
        self.assertGreater(len(key["appearances"]), 0)
        self.assertGreater(len(key["characterOutcomes"]), 0)
        with open(os.path.join(self.public_dir, "questions.json")) as f:
            questions = json.load(f)
        self.assertGreaterEqual(len(questions), 10)  # 5+3+2+2=12 nominal, floor allows sparse-data shortfall
        for q in questions:
            self.assertIn(q["id"], key)  # resolved answer flat-merged into answer_key.json

    def test_public_questions_file_has_no_answers(self):
        build_dataset(seed=42, public_dir=self.public_dir, private_dir=self.private_dir)
        with open(os.path.join(self.public_dir, "questions.json")) as f:
            questions = json.load(f)
        for q in questions:
            self.assertNotIn("actualYes", q)
            self.assertNotIn("correctOption", q)

    def test_all_six_public_files_exist(self):
        build_dataset(seed=42, public_dir=self.public_dir, private_dir=self.private_dir)
        for name in ["films.csv", "characters.csv", "appearances.csv",
                     "co_appearances.csv", "post_credits.csv", "roster.csv"]:
            self.assertTrue(os.path.exists(os.path.join(self.public_dir, name)), name)

    def test_private_dir_is_independent_of_public_dir(self):
        # A private_dir that isn't nested under public_dir must never end
        # up containing public files or vice versa -- this is the actual
        # safety property the split-directory signature exists for.
        build_dataset(seed=42, public_dir=self.public_dir, private_dir=self.private_dir)
        self.assertFalse(os.path.exists(os.path.join(self.public_dir, "answer_key.json")))
        self.assertFalse(os.path.exists(os.path.join(self.private_dir, "films.csv")))

    def test_draft_pool_only_contains_characters_with_real_outcomes(self):
        build_dataset(seed=42, public_dir=self.public_dir, private_dir=self.private_dir, team_count=55)
        with open(os.path.join(self.public_dir, "draft_pool.json")) as f:
            pool = json.load(f)
        with open(os.path.join(self.private_dir, "answer_key.json")) as f:
            key = json.load(f)
        self.assertGreater(len(pool), 0)
        for name in pool:
            self.assertIn(name, key["characterOutcomes"])

    def test_draft_pool_capped_at_available_characters_not_team_count(self):
        build_dataset(seed=42, public_dir=self.public_dir, private_dir=self.private_dir, team_count=1000)
        with open(os.path.join(self.public_dir, "draft_pool.json")) as f:
            pool = json.load(f)
        with open(os.path.join(self.private_dir, "answer_key.json")) as f:
            key = json.load(f)
        self.assertEqual(len(pool), len(key["characterOutcomes"]))

if __name__ == "__main__":
    unittest.main()
