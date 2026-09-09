const test = require('node:test');
const assert = require('node:assert/strict');
const { computeQuestionScore, computeAggregateReportScore } = require('./grading-server.js');

test('yesno question scores via brierScore against the answer key', () => {
  const question = { id: 'q1', type: 'yesno' };
  const submission = { probabilities: { yes: 90 } };
  const answerKey = { q1: { actualYes: true } };
  assert.equal(computeQuestionScore(question, submission, answerKey), 99);
});

test('multichoice question scores via multiChoiceScore against the answer key', () => {
  const question = { id: 'q2', type: 'multichoice', options: ['A', 'B', 'C'] };
  const submission = { probabilities: { A: 60, B: 30, C: 10 } };
  const answerKey = { q2: { correctOption: 'A' } };
  assert.equal(computeQuestionScore(question, submission, answerKey), 84);
});

test('an undefined submission defaults to neutral 50% (75 points), matching the spec\'s skipped-question rule', () => {
  const question = { id: 'q3', type: 'yesno' };
  const answerKey = { q3: { actualYes: false } };
  assert.equal(computeQuestionScore(question, undefined, answerKey), 75);
});

test('question missing from the answer key returns null', () => {
  const question = { id: 'q4', type: 'yesno' };
  const submission = { probabilities: { yes: 80 } };
  assert.equal(computeQuestionScore(question, submission, {}), null);
});

test('computeAggregateReportScore averages multiple judges, rounded to 2 decimals', () => {
  assert.equal(computeAggregateReportScore([{ total: 80 }]), 80);
  assert.equal(computeAggregateReportScore([{ total: 80 }, { total: 90 }]), 85);
  assert.equal(computeAggregateReportScore([{ total: 70 }, { total: 71 }, { total: 71 }]), 70.67);
});
