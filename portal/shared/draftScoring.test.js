const test = require('node:test');
const assert = require('node:assert/strict');
const { draftCharacterScore, draftTeamScore } = require('./draftScoring.js');

test('a character who survived, had top-third screentime, and teamed up scores 65', () => {
  assert.equal(draftCharacterScore({ survived: true, topThirdScreentime: true, hadTeamUp: true }), 65);
});

test('a character who did none of it scores 0', () => {
  assert.equal(draftCharacterScore({ survived: false, topThirdScreentime: false, hadTeamUp: false }), 0);
});

test('team score sums 3 characters, max 195', () => {
  const full = { survived: true, topThirdScreentime: true, hadTeamUp: true };
  assert.equal(draftTeamScore([full, full, full]), 195);
});
