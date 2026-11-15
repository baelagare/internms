import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/views/Governance.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/views/audit.css', import.meta.url), 'utf8');
const auditSource = source.slice(source.indexOf('const AUDIT_ACTION_LABELS'));

test('audit trail maps event types to plain labels and guards missing collections', () => {
  assert.match(auditSource, /Array\.isArray\(db\.auditLogs\)/);
  assert.match(auditSource, /Clearance granted/);
  assert.match(auditSource, /Alert dismissed/);
  assert.match(auditSource, /Policy clause added/);
  assert.doesNotMatch(auditSource, /Object\.entries\(selected\)/);
});

test('audit trail communicates non-authoritative records and honest empty states', () => {
  assert.match(auditSource, /Authoritative audit records are unavailable/);
  assert.match(auditSource, /No audit events recorded yet/);
  assert.match(auditSource, /Show raw event fields/);
  assert.doesNotMatch(auditSource, /'Event ID'/);
});

test('audit trail keeps responsive summary, filters, and disclosure styles', () => {
  assert.match(css, /@media \(min-width: 640px\)/);
  assert.match(css, /audit-summary/);
  assert.match(css, /audit-raw/);
});
