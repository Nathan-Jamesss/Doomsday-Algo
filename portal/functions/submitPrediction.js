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
    const points = computeSubmissionScore(question, submission, answerKey);

    const leaderboardRef = db.collection('leaderboard').doc(submission.teamId);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(leaderboardRef);
      const current = doc.exists ? doc.data() : { predictRaw: 0, draftRaw: 0, reportRaw: 0 };
      tx.set(leaderboardRef, { ...current, predictRaw: current.predictRaw + points }, { merge: true });
    });
  });

module.exports = { computeSubmissionScore, onSubmissionCreate };
