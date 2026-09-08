const test = require('node:test');
const assert = require('node:assert/strict');
const { computeSubmissionScore } = require('./submitPrediction.js');

test('yesno question scores via brierScore against the answer key', () => {
  const question = { id: 'q1', type: 'yesno' };
  const submission = { probabilities: { yes: 90 } };
  const answerKey = { q1: { actualYes: true } };
  assert.equal(computeSubmissionScore(question, submission, answerKey), 99);
});

test('multichoice question scores via multiChoiceScore against the answer key', () => {
  const question = { id: 'q2', type: 'multichoice', options: ['A', 'B', 'C'] };
  const submission = { probabilities: { A: 60, B: 30, C: 10 } };
  const answerKey = { q2: { correctOption: 'A' } };
  // brierScore(60, true) = 84 (NOTE: the plan's literal expression
  // `60 * 60 / 100 + 40` evaluates to 76 in JS, not 84 as its own comment
  // claimed -- fixed here to the actual correct value).
  assert.equal(computeSubmissionScore(question, submission, answerKey), 84);
});

test('unanswered question defaults to 50 percent per team', () => {
  const question = { id: 'q3', type: 'yesno' };
  const submission = { probabilities: {} };
  const answerKey = { q3: { actualYes: false } };
  assert.equal(computeSubmissionScore(question, submission, answerKey), 75);
});

test('unanswered multichoice question defaults to an even split across options', () => {
  const question = { id: 'q4', type: 'multichoice', options: ['A', 'B', 'C'] };
  const submission = { probabilities: {} };
  const answerKey = { q4: { correctOption: 'A' } };
  // Even split is 100/3 = 33.33...% per option; brierScore(33.333..., true) = 55.56.
  assert.equal(computeSubmissionScore(question, submission, answerKey), 55.56);
});
