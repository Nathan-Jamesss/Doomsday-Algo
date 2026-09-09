const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('./grading-server.js');

// Minimal in-memory Firestore-like mock. Tracks call counts so tests can
// assert on the debouncing/diffing properties directly, not just the
// end-state.
function makeMockDb(seed) {
  const store = JSON.parse(JSON.stringify(seed));
  const callCounts = { submissionsQuery: 0, leaderboardWrite: 0, publicWrite: 0 };
  const snapshotCallbacks = {};

  function docsFromCollection(name, filterFn) {
    const all = Object.entries(store[name] || {}).map(([id, data]) => ({ id, data: () => data }));
    return filterFn ? all.filter(filterFn) : all;
  }

  return {
    _store: store,
    _callCounts: callCounts,
    _fireSnapshot(collectionName, changes) {
      // changes: [{type: 'added', id, data}]
      const cb = snapshotCallbacks[collectionName];
      if (!cb) return;
      cb({
        docChanges: () => changes.map(c => ({ type: c.type, doc: { id: c.id, data: () => c.data } })),
      });
    },
    collection(name) {
      return {
        doc(id) {
          return {
            get: async () => {
              const data = (store[name] || {})[id];
              return { exists: data !== undefined, data: () => data };
            },
            set: async (data, opts) => {
              store[name] = store[name] || {};
              if (name === 'leaderboard') callCounts.leaderboardWrite++;
              store[name][id] = (opts && opts.merge) ? { ...(store[name][id] || {}), ...data } : data;
            },
          };
        },
        where(field, op, value) {
          if (name === 'submissions') callCounts.submissionsQuery++;
          return {
            get: async () => {
              const docs = docsFromCollection(name, d => d.data()[field] === value);
              return { forEach: (fn) => docs.forEach(fn), size: docs.length };
            },
          };
        },
        get: async () => {
          const docs = docsFromCollection(name);
          return { forEach: (fn) => docs.forEach(fn), size: docs.length };
        },
        onSnapshot(cb) { snapshotCallbacks[name] = cb; },
      };
    },
    batch() {
      const ops = [];
      return {
        set: (ref, data) => { ops.push({ ref, data }); },
        commit: async () => {
          ops.forEach(op => {
            callCounts.publicWrite++;
            store[op.ref._collectionName] = store[op.ref._collectionName] || {};
            store[op.ref._collectionName][op.ref._id] = op.data;
          });
        },
      };
    },
  };
}

// batch().set(ref, data) needs ref._id / ref._collectionName -- patch the
// doc() helper above to expose them (kept separate from the main mock for
// clarity: batch targets are collection(...).doc(...) refs too).
function patchDocRefsForBatch(db) {
  const origCollection = db.collection.bind(db);
  db.collection = (name) => {
    const c = origCollection(name);
    const origDoc = c.doc.bind(c);
    c.doc = (id) => {
      const ref = origDoc(id);
      ref._id = id;
      ref._collectionName = name;
      return ref;
    };
    return c;
  };
  return db;
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

test('a burst of "added" events for the same team regrades it only once (debounced), not once per event', async () => {
  const db = patchDocRefsForBatch(makeMockDb({
    questions: { q1: { type: 'yesno' } },
    answer_key: { phase5: { q1: { actualYes: true } } },
    submissions: {
      s1: { teamId: 'teamA', questionId: 'q1', probabilities: { yes: 90 }, submittedAt: 1 },
    },
    leaderboard: {},
  }));

  await startServer(db, { flushIntervalMs: 20 });

  // Simulate the initial onSnapshot replay firing "added" 3 times for the
  // same team (as a burst of real submissions would too) before the flush
  // interval elapses.
  db._fireSnapshot('submissions', [
    { type: 'added', id: 's1', data: { teamId: 'teamA' } },
    { type: 'added', id: 's1', data: { teamId: 'teamA' } },
    { type: 'added', id: 's1', data: { teamId: 'teamA' } },
  ]);

  await wait(60); // past the 20ms flush interval

  assert.equal(db._callCounts.submissionsQuery, 1, 'expected exactly one regrade query despite 3 added events for the same team');
  assert.equal(db._store.leaderboard.teamA.predictRaw, 99);
});

test('recomputePublic only writes leaderboard_public rows whose rank/total actually changed', async () => {
  const db = patchDocRefsForBatch(makeMockDb({
    questions: { q1: { type: 'yesno' } },
    answer_key: { phase5: { q1: { actualYes: true } } },
    submissions: {
      s1: { teamId: 'teamA', questionId: 'q1', probabilities: { yes: 90 }, submittedAt: 1 },
    },
    leaderboard: {},
  }));

  await startServer(db, { flushIntervalMs: 20 });

  db._fireSnapshot('submissions', [{ type: 'added', id: 's1', data: { teamId: 'teamA' } }]);
  await wait(60);
  const writesAfterFirstFlush = db._callCounts.publicWrite;
  assert.ok(writesAfterFirstFlush >= 1, 'expected at least one leaderboard_public write after the first real change');

  // Fire the exact same event again (idempotent re-submission scenario) --
  // recomputing should produce the same rank/total, so no new write.
  db._fireSnapshot('submissions', [{ type: 'added', id: 's1', data: { teamId: 'teamA' } }]);
  await wait(60);
  assert.equal(db._callCounts.publicWrite, writesAfterFirstFlush, 'expected no new leaderboard_public write when nothing actually changed');
});
