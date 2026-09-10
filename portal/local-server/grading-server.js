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
// This is a drop-in event: students arrive and leave whenever, over an
// extended window (the whole festival, potentially spanning both days),
// not a synchronized single sitting. This script is designed to run
// continuously for that entire window -- see the debouncing below, which
// exists specifically so a long-running, bursty, unpredictable submission
// pattern never comes close to Firestore's free-tier daily quota.
//
// Security note: this script authenticates with a service account key,
// which -- exactly like a Cloud Function's Admin SDK access -- bypasses
// Firestore security rules entirely. That's by design: firestore.rules
// already denies all client access to `leaderboard` and `answer_key`;
// only this script (or the Firebase Console) can read/write them.
//
// Setup: see RUNBOOK.md. In short: `npm install` in this directory, put
// a service account key (Firebase Console -> Project Settings -> Service
// Accounts -> Generate new private key -- free, no billing) at
// ./serviceAccountKey.json, then `npm start`. Leave the terminal window
// open for the whole event window (both days, if that's how it's run).

const path = require('path');
const { brierScore, multiChoiceScore } = require('../shared/scoring.js');
const { combineLeaderboard, rankTeams } = require('../shared/leaderboard.js');

// How often to flush a burst of regrades/recomputes. This is what keeps
// Firestore usage bounded regardless of submission rate: a burst of 100
// submissions in one second still produces at most one regrade per
// affected team and one public-leaderboard pass, not 100 of each.
const FLUSH_INTERVAL_MS = 3000;

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

function startServer(db, options = {}) {
  const flushIntervalMs = options.flushIntervalMs || FLUSH_INTERVAL_MS;
  let questionsCache = null;
  let answerKeyCache = null;

  // In-memory mirror of `leaderboard`, populated once at startup and kept
  // current as regrades happen -- this is what lets recomputePublic() run
  // with ZERO extra Firestore reads per cycle instead of re-reading the
  // whole collection every time (the bug caught in review: at 55 teams
  // that was ~55 reads on every single submission, ~53,000 reads for
  // Round 2 alone against a 50,000/day free cap).
  const leaderboardMemory = {};
  // Last {rank, total} actually written per team, so recomputePublic()
  // only writes rows that changed -- most cycles touch 1-3 teams, not all
  // of them.
  const publicMemory = {};

  const dirtyTeams = new Set();
  let flushScheduled = false;

  async function loadStaticData() {
    const qSnap = await db.collection('questions').get();
    questionsCache = [];
    qSnap.forEach(doc => questionsCache.push({ id: doc.id, ...doc.data() }));

    const akDoc = await db.collection('answer_key').doc('phase5').get();
    answerKeyCache = akDoc.exists ? akDoc.data() : null;

    const lbSnap = await db.collection('leaderboard').get();
    lbSnap.forEach(doc => { leaderboardMemory[doc.id] = doc.data(); });
  }

  // Recomputes a team's FULL predictRaw from scratch, rather than
  // incrementing. This is what correctly applies the spec's "a skipped
  // question defaults to 75 points (the neutral 50% score), never worse
  // than an honest shrug" rule: an unanswered question isn't just absent
  // from a running sum, it must be explicitly credited at the neutral
  // score, and a from-scratch recompute is also immune to any
  // double-counting risk an incremental += could have.
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

    const current = leaderboardMemory[teamId] || { predictRaw: 0, draftRaw: 0, reportRaw: 0 };
    const merged = { ...current, predictRaw, lastSubmittedAt };
    leaderboardMemory[teamId] = merged;
    await db.collection('leaderboard').doc(teamId).set(merged, { merge: true });
  }

  async function handleJudgeScore(reportId, teamId) {
    const scoresSnap = await db.collection('judge_scores').where('reportId', '==', reportId).get();
    const scores = [];
    scoresSnap.forEach(doc => scores.push(doc.data()));
    if (scores.length === 0) return;
    const reportRaw = computeAggregateReportScore(scores);
    const current = leaderboardMemory[teamId] || { predictRaw: 0, draftRaw: 0, reportRaw: 0 };
    const merged = { ...current, reportRaw };
    leaderboardMemory[teamId] = merged;
    await db.collection('leaderboard').doc(teamId).set(merged, { merge: true });
  }

  // `leaderboard` (raw per-round scores) is fully private -- a raw score
  // is an answer-extraction oracle (submit 100% on a throwaway team, read
  // the score back, repeat per question). `leaderboard_public` exposes
  // rank + blended total ONLY, computed here from the in-memory mirror
  // (no extra reads) and written only where the value actually changed
  // (no wasted writes).
  async function recomputePublic() {
    const questionCount = (questionsCache && questionsCache.length) || 34;
    const teams = Object.entries(leaderboardMemory).map(([id, d]) => {
      const predictPct = Math.min(100, (d.predictRaw || 0) / questionCount);
      const draftPct = Math.min(100, ((d.draftRaw || 0) / 65) * 100); // 65 = max for 1 exclusive pick/team
      const reportPct = d.reportRaw || 0;
      const combined = combineLeaderboard(predictPct, draftPct, reportPct);
      return { id, ...combined, predictRaw: d.predictRaw || 0, submittedAt: d.lastSubmittedAt || 0 };
    });
    const ranked = rankTeams(teams);
    const batch = db.batch();
    let anyChange = false;
    ranked.forEach((t, i) => {
      const rank = i + 1;
      const prev = publicMemory[t.id];
      if (!prev || prev.rank !== rank || prev.total !== t.total) {
        batch.set(db.collection('leaderboard_public').doc(t.id), { rank, total: t.total });
        publicMemory[t.id] = { rank, total: t.total };
        anyChange = true;
      }
    });
    if (anyChange) await batch.commit();
  }

  // Marks a team as needing a regrade and schedules a single flush a few
  // seconds out. Repeated calls within that window collapse into one
  // flush -- this is what turns Firestore's initial onSnapshot replay
  // (every existing submission fires as "added" the moment the listener
  // attaches) from "one regrade per submission" into "one regrade per
  // distinct team," and turns any real-world burst of simultaneous
  // submissions into the same bounded cost.
  function markDirty(teamId) {
    dirtyTeams.add(teamId);
    scheduleFlush();
  }

  function scheduleFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    setTimeout(() => {
      flushScheduled = false;
      flush().catch(err => console.error('flush error', err));
    }, flushIntervalMs);
  }

  async function flush() {
    const teams = Array.from(dirtyTeams);
    dirtyTeams.clear();
    for (const teamId of teams) {
      await regradeTeam(teamId).catch(err => console.error('regrade error for', teamId, err));
    }
    if (teams.length > 0) await recomputePublic();
  }

  return loadStaticData().then(() => {
    console.log(`Loaded ${questionsCache.length} questions, ${Object.keys(leaderboardMemory).length} existing leaderboard rows. Answer key: ${answerKeyCache ? 'present' : 'MISSING -- run seed.js before the event, grading will not work without it'}.`);

    db.collection('submissions').onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          markDirty(change.doc.data().teamId);
        }
      });
    });

    db.collection('judge_scores').onSnapshot(snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const { reportId, teamId } = change.doc.data();
          handleJudgeScore(reportId, teamId)
            .then(() => recomputePublic())
            .catch(err => console.error('judge score error for', reportId, err));
        }
      });
    });

    console.log('Grading server running. This is a drop-in event -- leave this window open for the entire event window (both days, if run that way). Ctrl+C to stop.');
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
