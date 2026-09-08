const functions = require('firebase-functions');
const admin = require('firebase-admin');

function computeAggregateReportScore(scoresForReport) {
  const sum = scoresForReport.reduce((acc, s) => acc + s.total, 0);
  return Math.round((sum / scoresForReport.length) * 100) / 100;
}

const onJudgeScoreCreate = functions.firestore
  .document('judge_scores/{scoreId}')
  .onCreate(async (snap) => {
    const { reportId, teamId } = snap.data();
    const db = admin.firestore();
    const scoresSnap = await db.collection('judge_scores').where('reportId', '==', reportId).get();
    const scores = [];
    scoresSnap.forEach(doc => scores.push(doc.data()));
    const reportRaw = computeAggregateReportScore(scores);
    await db.collection('leaderboard').doc(teamId).set({ reportRaw }, { merge: true });
  });

module.exports = { computeAggregateReportScore, onJudgeScoreCreate };
