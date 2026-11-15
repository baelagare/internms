import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveStatus, STATUS_MAP } from '../src/components/foundation/status.js';

test('resolveStatus resolves distinct workflow states and never confuses supervisor verification with coordinator approval', () => {
  const sup = resolveStatus('Supervisor Verified');
  const coord = resolveStatus('Coordinator Approved');
  assert.notEqual(sup.label, coord.label);
  assert.equal(sup.label, 'Supervisor verified');
  assert.equal(coord.label, 'Coordinator approved');
  assert.equal(sup.tone, 'info');
  assert.equal(coord.tone, 'success');

  const revision = resolveStatus('Returned for Revision');
  assert.equal(revision.tone, 'danger');
  assert.equal(revision.label, 'Returned for changes');

  const unrecorded = resolveStatus('');
  assert.equal(unrecorded.label, 'Not recorded');
  assert.equal(unrecorded.tone, 'neutral');

  for (const [key, meta] of Object.entries(STATUS_MAP)) {
    assert.ok(meta.label, `Missing label for status: ${key}`);
    assert.ok(['success', 'warning', 'danger', 'info', 'neutral'].includes(meta.tone), `Invalid tone for status: ${key}`);
  }
});

test('empty-state primitives default to a neutral inbox icon and support domain-specific icons', () => {
  const primitives = readFileSync(new URL('../src/components/foundation/primitives.jsx', import.meta.url), 'utf8');
  const icons = readFileSync(new URL('../src/components/Icons.jsx', import.meta.url), 'utf8');
  assert.match(primitives, /EmptyState\(\{ title = 'No records', description, action, icon = 'inbox' \}\)/);
  for (const icon of ['inbox', 'users', 'alert', 'chat', 'briefcase', 'document', 'clock', 'calendar', 'search']) {
    assert.match(icons, new RegExp(`\\b${icon}:`));
  }
});


test('data-table empty states support contextual icons and use search icon for query results', () => {
  const source = readFileSync(new URL('../src/components/foundation/records.jsx', import.meta.url), 'utf8');
  assert.match(source, /emptyIcon = 'inbox'/);
  assert.match(source, /icon=\{query \? 'search' : emptyIcon\}/);
});

test('Design tokens CSS defines all required neutral, semantic and typography variables', () => {
  const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
  for (const token of [
    '--color-canvas', '--color-surface', '--color-surface-subtle',
    '--color-text', '--color-text-secondary', '--color-text-tertiary',
    '--color-border', '--color-border-strong',
    '--color-accent', '--color-accent-hover', '--color-accent-active', '--color-accent-subtle',
    '--color-success', '--color-warning', '--color-danger', '--color-info',
    '--font-sans',
    '--radius-control', '--radius-panel', '--radius-overlay',
    '--duration-fast', '--duration-normal'
  ]) {
    assert.ok(css.includes(token), `Missing token: ${token}`);
  }
});

