import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { policyExplanation } from '../src/services/policyAvailability.js';

const source = readFileSync(new URL('../src/views/Governance.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/views/alerts.css', import.meta.url), 'utf8');

test('coordinator and admin alert screens include scoped review status categories and clear unavailable decision support', () => {
  assert.match(source, /item\.college === user\.college/);
  assert.match(source, /Needs Review/);
  assert.match(source, /Dispatched/);
  assert.match(source, /Dismissed/);
  assert.match(source, /Early-Warning Risk Detection/);
  assert.match(source, /Human Review Required/);
});

test('alert detail discloses raw evidence on demand and does not seed advisory copy', () => {
  assert.match(source, /View Raw Evidence Fields/);
  assert.match(source, /No verified policy references are available/);
  assert.match(source, /alert\.draftMessage \|\| ''/);
  assert.match(source, /Human Review Required/);
});

test('alert summary stays responsive and status controls are selectable', () => {
  assert.match(source, /label="Review Status"/);
  assert.match(css, /@media \(min-width: 640px\)/);
  assert.match(css, /alert-summary/);
});

test('policyExplanation accurately matches active corpus clauses to alert rule category', () => {
  const corpus = [
    { chunkId: 'pol-1', ruleCategory: 'RULE_A_ATTENDANCE', sourceDoc: 'CHED 104', verbatimText: 'Attendance rule' },
    { chunkId: 'pol-2', ruleCategory: 'RULE_B_MISALIGNMENT', sourceDoc: 'CHED 104', verbatimText: 'Task alignment rule' }
  ];

  const matched = policyExplanation({ ruleKey: 'RULE_B_MISALIGNMENT', ruleLabel: 'Task Non-Alignment' }, corpus);
  assert.equal(matched.retrievedClauses.length, 1);
  assert.equal(matched.retrievedClauses[0].chunkId, 'pol-2');
  assert.match(matched.synthesisText, /Task Non-Alignment/);

  const unmatched = policyExplanation({ ruleKey: 'RULE_UNKNOWN' }, corpus);
  assert.equal(unmatched.retrievedClauses.length, 0);
  assert.equal(unmatched.synthesisText, '');

  const empty = policyExplanation(null, null);
  assert.equal(empty.retrievedClauses.length, 0);
  assert.equal(empty.synthesisText, '');
});

