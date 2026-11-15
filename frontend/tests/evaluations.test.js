import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rubric, scoreEvaluation } from '../src/services/evaluations.js';

test('rubric contains exactly 4 groups and 19 criteria', () => {
  assert.equal(rubric.length, 4);
  const totalCriteria = rubric.reduce((sum, [, items]) => sum + items.length, 0);
  assert.equal(totalCriteria, 19);
});

test('scoreEvaluation computes correct total score, average, equivalent rating, and recommendation', () => {
  // Perfect score
  const perfectScores = Object.fromEntries(Array.from({ length: 19 }, (_, i) => [`q${i + 1}`, 5]));
  const perfect = scoreEvaluation(perfectScores);
  assert.equal(perfect.totalScore, 95);
  assert.equal(perfect.maxScore, 95);
  assert.equal(perfect.averageRating, 5.0);
  assert.match(perfect.equivalentRating, /Outstanding/);
  assert.match(perfect.recommendation, /Passed/);

  // Passing score
  const passingScores = Object.fromEntries(Array.from({ length: 19 }, (_, i) => [`q${i + 1}`, 3]));
  const passing = scoreEvaluation(passingScores);
  assert.equal(passing.totalScore, 57);
  assert.equal(passing.averageRating, 3.0);
  assert.match(passing.equivalentRating, /Satisfactory/);
  assert.match(passing.recommendation, /Passed/);

  // Failing score
  const lowScores = Object.fromEntries(Array.from({ length: 19 }, (_, i) => [`q${i + 1}`, 2]));
  const low = scoreEvaluation(lowScores);
  assert.equal(low.totalScore, 38);
  assert.equal(low.averageRating, 2.0);
  assert.match(low.equivalentRating, /Needs Improvement/);
  assert.match(low.recommendation, /For Improvement/);
});

test('scoreEvaluation rejects incomplete scores or out-of-bounds ratings', () => {
  assert.throws(() => scoreEvaluation({}), /Rate all 19 criteria/);
  assert.throws(() => scoreEvaluation({ q1: 5 }), /Rate all 19 criteria/);
  // 18 rated, 1 missing
  const partial = Object.fromEntries(Array.from({ length: 18 }, (_, i) => [`q${i + 1}`, 4]));
  assert.throws(() => scoreEvaluation(partial), /Rate all 19 criteria/);
  // Value < 1 or > 5
  assert.throws(() => scoreEvaluation({ ...partial, q19: 0 }), /Rate all 19 criteria/);
  assert.throws(() => scoreEvaluation({ ...partial, q19: 6 }), /Rate all 19 criteria/);
  assert.throws(() => scoreEvaluation({ ...partial, q19: 'invalid' }), /Rate all 19 criteria/);
});

test('evaluations view enforces completion, disables local-bypass labels, and links to backend availability', () => {
  const source = readFileSync(new URL('../src/views/Evaluations.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/views/evaluations.css', import.meta.url), 'utf8');
  assert.match(source, /Performance evaluations/);
  assert.match(source, /Criteria Completed/);
  assert.match(source, /19 criteria rated/);
  assert.match(source, /Submit performance evaluation/);
  assert.doesNotMatch(source, /Submit evaluation locally/);
  assert.doesNotMatch(source, /Update evaluation locally/);
  assert.match(source, /Backend connection required/);
  assert.match(css, /evaluation-score-card/);
  assert.match(css, /evaluation-rubric-fieldset/);
});