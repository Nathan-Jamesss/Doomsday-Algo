const test = require('node:test');
const assert = require('node:assert/strict');
const { revealPhase5 } = require('./reveal.js');

// Minimal in-memory Firestore-like mock covering only what reveal.js
// actually calls: collection(...).doc(...).get(), collection(...).get(),
// and a batch with set()/commit().
function makeMockDb(collections) {
  const store = JSON.parse(JSON.stringify(collections));
  const batchOps = [];
  return {
    collection(name) {
      return {
        doc(id) {
          return {
            get: async () => {
              const data = (store[name] || {})[id];
              return { exists: data !== undefined, data: () => data };
            },
          };
        },
        get: async () => {
          const docs = Object.entries(store[name] || {}).map(([id, data]) => ({ id, data: () => data }));
          return { forEach: (fn) => docs.forEach(fn), size: docs.length };
        },
      };
    },
    batch() {
      return {
        set: (ref, data) => { batchOps.push({ ref, data }); },
        commit: async () => { /* no-op: assertions read batchOps directly */ },
      };
    },
    _batchOps: batchOps,
    _store: store,
  };
}

test('reveal looks up draft outcomes by characterName, not by draft_picks doc ID', async () => {
  const db = makeMockDb({
    answer_key: {
      phase5: {
        characterOutcomes: {
          'Shuri': { survived: true, topThirdScreentime: true, hadTeamUp: false }, // 30+20 = 50
        },
      },
    },
    draft_picks: {
      // doc ID is the slug "shuri", NOT the real name -- reveal.js must
      // read characterName from the doc's own field, never doc.id.
      'shuri': { teamId: 'teamA', characterId: 'shuri', characterName: 'Shuri' },
    },
    questions: { q1: {}, q2: {} },
    leaderboard: {
      teamA: { predictRaw: 150, reportRaw: 80 },
    },
  });

  await revealPhase5(db);

  const leaderboardWrite = db._batchOps.find(op => op.data.draftRaw !== undefined);
  assert.ok(leaderboardWrite, 'expected a leaderboard write with draftRaw');
  assert.equal(leaderboardWrite.data.draftRaw, 50);
});

test('a team with no draft pick still gets a leaderboard_public row (draftRaw 0)', async () => {
  const db = makeMockDb({
    answer_key: { phase5: { characterOutcomes: {} } },
    draft_picks: {},
    questions: { q1: {} },
    leaderboard: { teamB: { predictRaw: 90, reportRaw: 100 } },
  });

  const result = await revealPhase5(db);
  assert.equal(result.teamsScored, 1);
  const publicWrite = db._batchOps.find(op => op.data.rank !== undefined);
  assert.ok(publicWrite);
});

test('a drafted character absent from characterOutcomes falls back to zero, not a crash', async () => {
  const db = makeMockDb({
    answer_key: { phase5: { characterOutcomes: {} } }, // "Ghost" never appeared in Phase 5
    draft_picks: {
      ghost: { teamId: 'teamC', characterId: 'ghost', characterName: 'Ghost' },
    },
    questions: { q1: {} },
    leaderboard: {},
  });

  await revealPhase5(db);
  const write = db._batchOps.find(op => op.data.draftRaw !== undefined);
  assert.equal(write.data.draftRaw, 0);
});
