const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { draftTeamScore } = require('../shared/draftScoring.js');

const revealPhase5 = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.isAdmin !== true) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  const db = admin.firestore();
  const answerKeyDoc = await db.collection('answer_key').doc('phase5').get();
  const answerKey = answerKeyDoc.data();

  const picksSnap = await db.collection('draft_picks').get();
  const picksByTeam = {};
  picksSnap.forEach(doc => {
    const { teamId, characterName } = doc.data();
    picksByTeam[teamId] = picksByTeam[teamId] || [];
    // characterOutcomes in the answer key is keyed by the real character
    // name (e.g. "Shuri"), not the slugified draft_picks doc ID (e.g.
    // "shuri") — the pick doc must carry characterName for this lookup
    // to resolve. See Task 13's draft.js, which writes both fields.
    picksByTeam[teamId].push(characterName);
  });

  const batch = db.batch();
  for (const [teamId, characterNames] of Object.entries(picksByTeam)) {
    const outcomes = characterNames.map(name => answerKey.characterOutcomes[name] || {
      survived: false, topThirdScreentime: false, hadTeamUp: false,
    });
    const draftRaw = draftTeamScore(outcomes);
    batch.set(db.collection('leaderboard').doc(teamId), { draftRaw }, { merge: true });
  }
  batch.set(db.collection('reveal_state').doc('status'), { revealed: true, revealedAt: Date.now() });
  await batch.commit();
  return { teamsScored: Object.keys(picksByTeam).length };
});

module.exports = { revealPhase5 };
