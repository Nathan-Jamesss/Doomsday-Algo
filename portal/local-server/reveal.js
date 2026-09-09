#!/usr/bin/env node
// portal/local-server/reveal.js
//
// One-shot script the organizer runs at the moment of the Phase 5 reveal.
// Replaces the admin-only `revealPhase5` Cloud Function callable (which
// required Firebase Authentication + a custom admin claim -- infra this
// project never set up, and which required Blaze billing to even exist).
// Since only the organizer holds serviceAccountKey.json, "run this
// script" already IS the access control; no auth layer is needed.
//
// Run: node reveal.js
// Requires: grading-server.js to have been running (or run this after
// stopping it briefly -- either way, run `npm run start` again afterward
// so ongoing Predict submissions keep grading through the rest of the
// event).

const path = require('path');
const { draftCharacterScore, draftTeamScore } = require('../shared/draftScoring.js');
const { combineLeaderboard, rankTeams } = require('../shared/leaderboard.js');

async function revealPhase5(db) {
  const answerKeyDoc = await db.collection('answer_key').doc('phase5').get();
  if (!answerKeyDoc.exists) {
    throw new Error('answer_key/phase5 not found -- run seed.js before the event.');
  }
  const answerKey = answerKeyDoc.data();

  const picksSnap = await db.collection('draft_picks').get();
  const picksByTeam = {};
  picksSnap.forEach(doc => {
    const { teamId, characterName } = doc.data();
    picksByTeam[teamId] = picksByTeam[teamId] || [];
    // characterOutcomes is keyed by the real character name (e.g.
    // "Shuri"), not the slugified draft_picks doc ID (e.g. "shuri") --
    // this exact confusion was a real bug caught and fixed earlier in
    // this project's Cloud Functions version; reveal.js must not
    // reintroduce it by keying off doc.id instead of characterName.
    picksByTeam[teamId].push(characterName);
  });

  const questionsSnap = await db.collection('questions').get();
  const questionCount = questionsSnap.size || 18;

  const leaderboardSnap = await db.collection('leaderboard').get();
  const existingLeaderboard = {};
  leaderboardSnap.forEach(doc => { existingLeaderboard[doc.id] = doc.data(); });

  const batch = db.batch();
  const allTeamIds = new Set([...Object.keys(picksByTeam), ...Object.keys(existingLeaderboard)]);
  const finalRows = [];

  for (const teamId of allTeamIds) {
    const characterNames = picksByTeam[teamId] || [];
    const outcomes = characterNames.map(name => answerKey.characterOutcomes[name] || {
      survived: false, topThirdScreentime: false, hadTeamUp: false,
    });
    const draftRaw = draftTeamScore(outcomes);
    const current = existingLeaderboard[teamId] || { predictRaw: 0, reportRaw: 0 };
    const merged = { ...current, draftRaw };
    batch.set(db.collection('leaderboard').doc(teamId), merged, { merge: true });

    const predictPct = Math.min(100, (merged.predictRaw || 0) / questionCount);
    const draftPct = Math.min(100, (draftRaw / 65) * 100);
    const reportPct = merged.reportRaw || 0;
    const combined = combineLeaderboard(predictPct, draftPct, reportPct);
    finalRows.push({ id: teamId, ...combined, predictRaw: merged.predictRaw || 0, submittedAt: merged.lastSubmittedAt || 0 });
  }

  const ranked = rankTeams(finalRows);
  ranked.forEach((t, i) => {
    batch.set(db.collection('leaderboard_public').doc(t.id), { rank: i + 1, total: t.total });
  });

  batch.set(db.collection('reveal_state').doc('status'), { revealed: true, revealedAt: Date.now() });
  await batch.commit();
  return { teamsScored: allTeamIds.size };
}

if (require.main === module) {
  const admin = require('firebase-admin');
  const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  revealPhase5(admin.firestore())
    .then(result => {
      console.log(`Phase 5 revealed. Scored ${result.teamsScored} teams.`);
      process.exit(0);
    })
    .catch(err => {
      console.error('Reveal failed:', err);
      process.exit(1);
    });
}

module.exports = { revealPhase5 };
