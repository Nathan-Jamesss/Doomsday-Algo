const functions = require('firebase-functions');
const admin = require('firebase-admin');

function computeDraftAssignment(existingPicks, characterId, teamId) {
  if (existingPicks[characterId]) {
    return { allowed: false, reason: `Character already picked by ${existingPicks[characterId]}` };
  }
  return { allowed: true };
}

const onDraftPickCreate = functions.firestore
  .document('draft_picks/{characterId}')
  .onCreate(async (snap, context) => {
    // Firestore's `create`-only security rule already prevents overwriting
    // an existing doc; this trigger just logs/no-ops. Real contention
    // is resolved by Firestore's atomic document creation semantics —
    // two simultaneous creates on the same doc ID, one wins, one errors
    // client-side and the client re-renders the now-taken character.
    return null;
  });

module.exports = { computeDraftAssignment, onDraftPickCreate };
