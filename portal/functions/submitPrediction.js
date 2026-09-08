const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { brierScore, multiChoiceScore } = require('../shared/scoring.js');

function computeSubmissionScore(question, submission, answerKey) {
  const key = answerKey[question.id];
  if (question.type === 'yesno') {
    const p = submission.probabilities.yes !== undefined ? submission.probabilities.yes : 50;
    return brierScore(p, key.actualYes);
  }
  if (question.type === 'multichoice') {
    const probs = Object.keys(submission.probabilities).length > 0
      ? submission.probabilities
      : Object.fromEntries(question.options.map(o => [o, 100 / question.options.length]));
    return multiChoiceScore(probs, key.correctOption);
  }
  throw new Error(`Unknown question type: ${question.type}`);
}

const onSubmissionCreate = functions.firestore
  .document('submissions/{submissionId}')
  .onCreate(async (snap) => {
    const submission = snap.data();
    const db = admin.firestore();

    const [questionDoc, answerKeyDoc] = await Promise.all([
      db.collection('questions').doc(submission.questionId).get(),
      db.collection('answer_key').doc('phase5').get(),
    ]);
    if (!questionDoc.exists || !answerKeyDoc.exists) return;

    const question = { id: submission.questionId, ...questionDoc.data() };
    const answerKey = answerKeyDoc.data();
    // The answer_key doc can exist while still lacking an entry for this
    // specific question (partial seeding) — no-op rather than crash the
    // trigger, matching the doc-level existence guard above.
    if (!answerKey[question.id]) return;
    const points = computeSubmissionScore(question, submission, answerKey);

    const leaderboardRef = db.collection('leaderboard').doc(submission.teamId);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(leaderboardRef);
      const current = doc.exists ? doc.data() : { predictRaw: 0, draftRaw: 0, reportRaw: 0 };
      // leaderboard/{teamId} has multiple writers (this trigger writes
      // predictRaw, Task 9's triggers write draftRaw/reportRaw) — if
      // another trigger created the doc first with only its own field
      // set, current.predictRaw is undefined here, and undefined + points
      // would silently write NaN. Default to 0 explicitly.
      tx.set(leaderboardRef, { ...current, predictRaw: (current.predictRaw || 0) + points }, { merge: true });
    });
  });

module.exports = { computeSubmissionScore, onSubmissionCreate };
