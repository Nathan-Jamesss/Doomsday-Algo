const test = require('node:test');
const assert = require('node:assert/strict');
const { combineLeaderboard, rankTeams } = require('./leaderboard.js');

test('spec worked example: Team A (82/60/90) beats Team B (95/40/50)', () => {
  const a = combineLeaderboard(82, 60, 90);
  const b = combineLeaderboard(95, 40, 50);
  assert.equal(a.total, 80);
  assert.equal(b.total, 70.5);
  assert.ok(a.total > b.total);
});

test('tie-break falls back to higher raw Predict score', () => {
  const teams = [
    { id: 'X', total: 80, predictRaw: 1200, submittedAt: 100 },
    { id: 'Y', total: 80, predictRaw: 1400, submittedAt: 50 },
  ];
  const ranked = rankTeams(teams);
  assert.equal(ranked[0].id, 'Y');
});

test('second tie-break falls back to earlier submission timestamp', () => {
  const teams = [
    { id: 'X', total: 80, predictRaw: 1200, submittedAt: 100 },
    { id: 'Y', total: 80, predictRaw: 1200, submittedAt: 50 },
  ];
  const ranked = rankTeams(teams);
  assert.equal(ranked[0].id, 'Y');
});
