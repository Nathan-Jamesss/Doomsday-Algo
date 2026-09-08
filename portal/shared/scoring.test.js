const test = require('node:test');
const assert = require('node:assert/strict');
const { brierScore, multiChoiceScore } = require('./scoring.js');

test('50% confidence always scores 75, regardless of outcome', () => {
  assert.equal(brierScore(50, true), 75);
  assert.equal(brierScore(50, false), 75);
});

test('90% confident and right scores 99', () => {
  assert.equal(brierScore(90, true), 99);
});

test('90% confident and wrong scores 19', () => {
  assert.equal(brierScore(90, false), 19);
});

test('100% confidence and wrong scores 0', () => {
  assert.equal(brierScore(100, false), 0);
});

test('100% confidence and right scores 100', () => {
  assert.equal(brierScore(100, true), 100);
});

test('multiChoiceScore scores against the probability placed on the correct option', () => {
  const score = multiChoiceScore({ A: 60, B: 30, C: 10 }, 'A');
  assert.equal(score, brierScore(60, true));
});
