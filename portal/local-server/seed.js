#!/usr/bin/env node
// portal/local-server/seed.js
//
// One-time (per event/per seed) script: loads the generator's output into
// Firestore. Run this AFTER `python build.py` and BEFORE the event starts.
//
// Run: node seed.js [--public-dir ../public/data] [--private-dir ../dataset/generator/output/private]
//
// Critical invariant: each question document's Firestore ID MUST equal
// its own `id` field (e.g. "q1"). grading-server.js and reveal.js both
// look up answerKey[question.id] using that ID directly -- if this script
// (or a future replacement) ever seeds with Firestore auto-IDs instead,
// every submission will silently score against nothing, with no error
// anywhere in the pipeline. This was flagged as a real risk in final
// review specifically because the failure mode is silent.

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = { publicDir: '../public/data', privateDir: '../dataset/generator/output/private' };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--public-dir') args.publicDir = argv[++i];
    if (argv[i] === '--private-dir') args.privateDir = argv[++i];
  }
  return args;
}

async function seed(db, publicDir, privateDir) {
  // path.resolve (not path.join) so an absolute path passed in (as tests
  // do) is used as-is, while the relative CLI defaults still resolve
  // against this file's own directory.
  const questionsPath = path.resolve(__dirname, publicDir, 'questions.json');
  const answerKeyPath = path.resolve(__dirname, privateDir, 'answer_key.json');

  if (!fs.existsSync(questionsPath)) throw new Error(`questions.json not found at ${questionsPath} -- run build.py first`);
  if (!fs.existsSync(answerKeyPath)) throw new Error(`answer_key.json not found at ${answerKeyPath} -- run build.py first`);

  const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  const answerKey = JSON.parse(fs.readFileSync(answerKeyPath, 'utf8'));

  const batch = db.batch();
  for (const q of questions) {
    // Doc ID = q.id, not an auto-generated ID -- see file header.
    const { id, ...fields } = q;
    batch.set(db.collection('questions').doc(id), fields);
  }
  batch.set(db.collection('answer_key').doc('phase5'), answerKey);
  await batch.commit();

  return { questionCount: questions.length };
}

if (require.main === module) {
  const admin = require('firebase-admin');
  const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const args = parseArgs();
  seed(admin.firestore(), args.publicDir, args.privateDir)
    .then(result => {
      console.log(`Seeded ${result.questionCount} questions and the Phase 5 answer key.`);
      process.exit(0);
    })
    .catch(err => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

module.exports = { seed };
