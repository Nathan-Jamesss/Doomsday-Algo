const test = require('node:test');
const assert = require('node:assert/strict');
const { computeDraftAssignment } = require('./draftPick.js');

test('a character with no existing pick is allowed', () => {
  const result = computeDraftAssignment({}, 'shuri', 'team1');
  assert.equal(result.allowed, true);
});

test('a character already picked by another team is rejected', () => {
  const result = computeDraftAssignment({ shuri: 'team2' }, 'shuri', 'team1');
  assert.equal(result.allowed, false);
  assert.match(result.reason, /already/i);
});

test('a team cannot pick the same character twice under their own id (idempotent no-op stays rejected)', () => {
  const result = computeDraftAssignment({ shuri: 'team1' }, 'shuri', 'team1');
  assert.equal(result.allowed, false);
});
