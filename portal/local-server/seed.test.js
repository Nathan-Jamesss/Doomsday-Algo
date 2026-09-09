const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { seed } = require('./seed.js');

function makeMockDb() {
  const batchOps = [];
  return {
    collection(name) {
      return { doc(id) { return { _name: name, _id: id }; } };
    },
    batch() {
      return {
        set: (ref, data) => { batchOps.push({ collection: ref._name, id: ref._id, data }); },
        commit: async () => {},
      };
    },
    _batchOps: batchOps,
  };
}

test('seeded question doc IDs equal the question\'s own id field, not an auto-ID', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seedtest-'));
  const publicDir = path.join(tmp, 'public');
  const privateDir = path.join(tmp, 'private');
  fs.mkdirSync(publicDir);
  fs.mkdirSync(privateDir);
  fs.writeFileSync(path.join(publicDir, 'questions.json'), JSON.stringify([
    { id: 'q1', type: 'yesno', text: 'Will X survive?' },
    { id: 'q2', type: 'multichoice', text: 'Who?', options: ['A', 'B'] },
  ]));
  fs.writeFileSync(path.join(privateDir, 'answer_key.json'), JSON.stringify({
    q1: { actualYes: true }, q2: { correctOption: 'A' }, characterOutcomes: {},
  }));

  const db = makeMockDb();
  // seed.js resolves publicDir/privateDir relative to __dirname (this
  // file's own directory), so pass absolute paths here for the test.
  const result = await seed(db, publicDir, privateDir);

  assert.equal(result.questionCount, 2);
  const q1Write = db._batchOps.find(op => op.collection === 'questions' && op.id === 'q1');
  const q2Write = db._batchOps.find(op => op.collection === 'questions' && op.id === 'q2');
  assert.ok(q1Write, 'expected a questions doc with ID exactly "q1"');
  assert.ok(q2Write, 'expected a questions doc with ID exactly "q2"');
  assert.equal(q1Write.data.id, undefined, 'the id field should not be duplicated inside the doc body');

  const answerKeyWrite = db._batchOps.find(op => op.collection === 'answer_key' && op.id === 'phase5');
  assert.ok(answerKeyWrite);
  assert.deepEqual(answerKeyWrite.data.characterOutcomes, {});

  fs.rmSync(tmp, { recursive: true, force: true });
});
