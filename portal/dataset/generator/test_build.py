import unittest, os, csv, json, shutil, tempfile
from build import build_dataset

class TestBuild(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_public_dir_has_no_phase5_data(self):
        build_dataset(seed=42, output_dir=self.tmp)
        with open(os.path.join(self.tmp, "public", "films.csv")) as f:
            rows = list(csv.DictReader(f))
        phases = {row["phase"] for row in rows}
        self.assertEqual(phases, {"1", "2", "3", "4"})

    def test_private_answer_key_has_phase5_and_resolved_questions(self):
        build_dataset(seed=42, output_dir=self.tmp)
        with open(os.path.join(self.tmp, "private", "answer_key.json")) as f:
            key = json.load(f)
        self.assertEqual(len(key["films"]), 7)
        self.assertGreater(len(key["appearances"]), 0)
        self.assertGreater(len(key["characterOutcomes"]), 0)
        with open(os.path.join(self.tmp, "public", "questions.json")) as f:
            questions = json.load(f)
        self.assertGreaterEqual(len(questions), 15)
        for q in questions:
            self.assertIn(q["id"], key)  # resolved answer flat-merged into answer_key.json

    def test_public_questions_file_has_no_answers(self):
        build_dataset(seed=42, output_dir=self.tmp)
        with open(os.path.join(self.tmp, "public", "questions.json")) as f:
            questions = json.load(f)
        for q in questions:
            self.assertNotIn("actualYes", q)
            self.assertNotIn("correctOption", q)

    def test_all_six_public_files_exist(self):
        build_dataset(seed=42, output_dir=self.tmp)
        for name in ["films.csv", "characters.csv", "appearances.csv",
                     "co_appearances.csv", "post_credits.csv", "roster.csv"]:
            self.assertTrue(os.path.exists(os.path.join(self.tmp, "public", name)), name)

if __name__ == "__main__":
    unittest.main()
