const test = require('node:test');
const assert = require('node:assert/strict');
const { computeAggregateReportScore } = require('./judgeScore.js');

test('a single judge score is the average of one', () => {
  assert.equal(computeAggregateReportScore([{ total: 80 }]), 80);
});

test('two judges average to the midpoint', () => {
  assert.equal(computeAggregateReportScore([{ total: 80 }, { total: 90 }]), 85);
});

test('rounds to 2 decimal places', () => {
  assert.equal(computeAggregateReportScore([{ total: 70 }, { total: 71 }, { total: 71 }]), 70.67);
});
