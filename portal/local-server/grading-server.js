#!/usr/bin/env node
// portal/local-server/grading-server.js
//
// Replaces Firebase Cloud Functions entirely. Cloud Functions (any trigger
// type, including Firestore triggers) require the Blaze pay-as-you-go
// plan even to stay inside the free quota -- Google requires a billing
// card on file regardless of whether anything is ever actually charged.
// This event has a hard zero-cost, zero-card constraint, so this script
// runs on the organizer's own laptop for the event's duration instead,
// doing exactly what the Cloud Functions in portal/functions/ would have
// done. Firestore itself (database, rules, Hosting) stays on the free
// Spark plan with no card needed at all.
//
// Security note: this script authenticates with a service account key,
// which -- exactly like a Cloud Function's Admin SDK access -- bypasses
// Firestore security rules entirely. That's by design: firestore.rules
// already denies all client access to `leaderboard` and `answer_key`;
// only this script (or the Firebase Console) can read/write them. Moving
// the runtime from Google's servers to this laptop changes nothing about
// that trust boundary.
//
// Setup: see RUNBOOK.md. In short: `npm install` in this directory, put
// a service account key (Firebase Console -> Project Settings -> Service
// Accounts -> Generate new private key -- free, no billing) at
// ./serviceAccountKey.json, then `npm start`. Leave the terminal window
// open for the whole event.

const path = require('path');
const { brierScore, multiChoiceScore } = require('../shared/scoring.js');
const { combineLeaderboard, rankTeams } = require('../shared/leaderboard.js');

function computeAggregateReportScore(scoresForReport) {
  const sum = scoresForReport.reduce((acc, s) => acc + s.total, 0);
  return Math.round((sum / scoresForReport.length) * 100) / 100;
}

function computeQuestionScore(question, submission, answerKey) {
  const key = answerKey[question.id];
  if (!key) return null;
  if (question.type === 'yesno') {
    const p = submission && submission.probabilities && submission.probabilities.yes !== undefined
      ? submission.probabilities.yes : 50;
    return brierScore(p, key.actualYes);
  }
  if (question.type === 'multichoice') {
    const hasAny = submission && submission.probabilities && Object.keys(submission.probabilities).length > 0;
    const probs = hasAny
      ? submission.probabilities
      : Object.fromEntries(question.options.map(o => [o, 100 / question.options.length]));
    return multiChoiceScore(probs, key.correctOption);
  }
  return null;
}

function startServer(db) {
  let questionsCache = null;
  let answerKeyCache = null;

  async function loadStaticData() {
    const qSnap = await db.collection('questions').get();
    questionsCache = [];
    qSnap.forEach(doc => questionsCache.push({ id: doc.id, ...doc.data() }));

    const akDoc = await db.collection('answer_key').doc('phase5').get();
    answerKeyCache = akDoc.exists ? akDoc.data() : null;
  }

  // Recomputes a team's FULL predictRaw from scratch on every submission
  // event, rather than incrementing. This is what correctly applies the
  // spec's "a skipped question defaults to 75 points (the neutral 50%
  // score), never worse than an honest shrug" rule: an unanswered
  // question isn't just absent from a running sum, it must be explicitly
  // credited at the neutral score, and a from-scratch recompute is also
  // immune to any double-counting risk an incremental += could have.
  async function regradeTeam(teamId) {
    if (!answerKeyCache || !questionsCache) return;
    const subsSnap = await db.collection('submissions').where('teamId', '==', teamId).get();
    const byQuestion = {};
    subsSnap.forEach(doc => { byQuestion[doc.data().questionId] = doc.data(); });

    let predictRaw = 0;
    let lastSubmittedAt = 0;
    for (const q of questionsCache) {
      const submission = byQuestion[q.id];
      if (submission) {
        const score = computeQuestionScore(q, submission, answerKeyCache);
        predictRaw += score !== null ? score : 75;
        if (submission.submittedAt > lastSubmittedAt) lastSubmittedAt = submission.submittedAt;
      } else {
        predictRaw += 75;
      }
    }

    await writeLeaderboard(teamId, { predictRaw, lastSubmittedAt });
  }

  async function writeLeaderboard(teamId, patch) {
    const ref = db.collection('leaderboard').doc(teamId);
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const current = doc.exists ? doc.data() : { predictRaw: 0, draftRaw: 0, reportRaw: 0 };
      tx.set(ref, { ...current, ...patch }, { merge: true });
    });
    await recomputePublicLeaderboard();
  }

  // `leaderboard` is fully private (Firestore rules deny all client
  // access, same as answer_key) -- a raw per-round score is an
  // answer-extraction oracle: a throwaway team submitting 100% on one
  // question and reading its own predictRaw back instantly reveals that
  // question's true/false. `leaderboard_public` exposes rank and the
  // blended total ONLY, never a per-round breakdown, so it can't be used
  // to isolate any single question's answer.
  async function recomputePublicLeaderboard() {
    const snap = await db.collection('leaderboard').get();
    const questionCount = (questionsCache && questionsCache.length) || 18;
    const teams = [];
    snap.forEach(doc => {
      const d = doc.data();
      const predictPct = Math.min(100, (d.predictRaw || 0) / questionCount);
      const draftPct = Math.min(100, ((d.draftRaw || 0) / 65) * 100); // 65 = max for 1 exclusive pick/team
      const reportPct = d.reportRaw || 0;
      const combined = combineLeaderboard(predictPct, draftPct, reportPct);
      teams.push({ id: doc.id, ...combined, predictRaw: d.predictRaw || 0, submittedAt: d.lastSubmittedAt || 0 });
    });
    const ranked = rankTeams(teams);
    const batch = db.batch();
    ranked.forEach((t, i) => {
      batch.set(db.collection('leaderboard_public').doc(t.id), { rank: i + 1, total: t.total });
    });
    if (ranked.length > 0) await batch.commit();
  }

  async function handleJudgeScore(reportId, teamId) {
    const scoresSnap = await db.collection('judge_scores').where('reportId', '==', reportId).get();
    const scores = [];
    scoresSnap.forEach(doc => scores.push(doc.data()));
    if (scores.length === 0) return;
    const reportRaw = computeAggregateReportScore(scores);
    await writeLeaderboard(teamId, { reportRaw });
  }

  return loadStaticData().then(() => {
    console.log(`Loaded ${questionsCache.length} questions. Answer key: ${answerKeyCache ? 'present' : 'MISSING -- run seed.js before the event, grading will not work without it'}.`);

    db.collection('submissions').onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const { teamId } = change.doc.data();
          regradeTeam(teamId).catch(err => console.error('regrade error for', teamId, err));
        }
      });
    });

    db.collection('judge_scores').onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const { reportId, teamId } = change.doc.data();
          handleJudgeScore(reportId, teamId).catch(err => console.error('judge score error for', reportId, err));
        }
      });
    });

    console.log('Grading server running. Leave this window open for the duration of the event. Ctrl+C to stop.');
  });
}

if (require.main === module) {
  // Required lazily (not at module top) so the pure functions above stay
  // unit-testable via `node --test` without needing `npm install` first.
  const admin = require('firebase-admin');
  const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  startServer(admin.firestore()).catch(err => {
    console.error('Fatal error starting grading server:', err);
    process.exit(1);
  });
}

module.exports = { computeQuestionScore, computeAggregateReportScore, startServer };
