import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/views/Management.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/views/staff.css', import.meta.url), 'utf8');
const staffSource = source.slice(source.indexOf('const STAFF_ROLE_LABELS'), source.indexOf('function SettingsForm'));

test('staff directory shows human role labels and invitation status instead of raw tokens', () => {
  assert.match(staffSource, /OJT coordinator/);
  assert.match(staffSource, /Host company representative/);
  assert.match(staffSource, /Token issued/);
  assert.doesNotMatch(staffSource, /label: 'Invitation token'/);
});

test('staff creation matches the authentication direction: SSO for coordinators, email/password for representatives', () => {
  assert.match(staffSource, /No password is required when creating the account/);
  assert.match(staffSource, /Host representatives sign in with email and password/);
  assert.match(staffSource, /\{supervisor && <Field required label="Initial password"/);
  assert.doesNotMatch(staffSource, /College code or exact partner company name/);
});

test('staff directory guards missing collections and offers guided scope options', () => {
  assert.match(staffSource, /Array\.isArray\(db\.users\)/);
  assert.match(staffSource, /No partner companies are recorded yet/);
  assert.match(staffSource, /No staff accounts/);
  assert.match(css, /@media \(min-width: 640px\)/);
  assert.match(css, /staff-summary/);
});
