import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/views/Governance.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/views/alerts.css', import.meta.url), 'utf8');

test('coordinator and admin alert screens include scoped review status categories and clear unavailable decision support', () => {
  assert.match(source, /item\.college === user\.college/);
  assert.match(source, /Needs review/);
  assert.match(source, /Dispatched/);
  assert.match(source, /Dismissed/);
  assert.match(source, /Policy-based recommendations are unavailable/);
  assert.match(source, /Human review is required before any action is sent/);
});

test('alert detail discloses raw evidence on demand and does not seed advisory copy', () => {
  assert.match(source, /View raw evidence fields/);
  assert.match(source, /No verified policy references are available/);
  assert.match(source, /alert\.draftMessage \|\| ''/);
  assert.match(source, /Human review required/);
});

test('alert summary stays responsive and status controls are selectable', () => {
  assert.match(source, /label="Review status"/);
  assert.match(css, /@media \(min-width: 640px\)/);
  assert.match(css, /alert-summary/);
});
