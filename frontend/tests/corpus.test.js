import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/views/Management.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/views/corpus.css', import.meta.url), 'utf8');

const corpusSource = source.slice(source.indexOf('const POLICY_CATEGORY_LABELS'));

test('policy corpus screen shows human category labels, an unavailable-save notice, and empty states', () => {
  assert.match(corpusSource, /title="Policy Corpus"/);
  assert.match(corpusSource, /Attendance/);
  assert.match(corpusSource, /Task alignment/);
  assert.match(corpusSource, /Documents/);
  assert.match(corpusSource, /cannot be saved until the Phase 4 backend is connected/);
  assert.match(corpusSource, /No policy clauses yet/);
  assert.match(corpusSource, /Corpus unavailable/);
});

test('policy corpus table no longer exposes index status, placeholders, or raw rule keys as visible labels', () => {
  assert.doesNotMatch(corpusSource, /Index status/);
  assert.doesNotMatch(corpusSource, /lastIndexed', label: 'Last indexed'/);
  assert.doesNotMatch(corpusSource, /\[PLACEHOLDER\]/);
  assert.doesNotMatch(corpusSource, /options: \['RULE_A_ATTENDANCE'/);
});

test('policy corpus keeps the createPolicy service boundary and responsive summary styles', () => {
  assert.match(corpusSource, /createPolicy\(user, values\)/);
  assert.match(css, /@media \(min-width: 640px\)/);
  assert.match(css, /corpus-summary/);
});
