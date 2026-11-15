import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contactsFor } from '../src/services/records.js';

const users = [
  { id: 'student-a', role: 'student', college: 'College A', company: 'Host A' },
  { id: 'student-b', role: 'student', college: 'College B', company: 'Host B' },
  { id: 'coord-a', role: 'coordinator', college: 'College A' },
  { id: 'coord-b', role: 'coordinator', college: 'College B' },
  { id: 'host-a', role: 'supervisor', company: 'Host A' },
  { id: 'host-b', role: 'supervisor', company: 'Host B' },
  { id: 'admin', role: 'admin' }
];

test('student contacts are scoped to their college coordinator, assigned host and admin', () => {
  const ids = contactsFor({ users }, users[0]).map(person => person.id);
  assert.deepEqual(ids, ['coord-a', 'host-a', 'admin']);
});

test('host representative contacts include only scoped students and staff roles', () => {
  const ids = contactsFor({ users }, users[4]).map(person => person.id);
  assert.deepEqual(ids, ['student-a', 'coord-a', 'coord-b', 'admin']);
});

test('coordinator contacts include assigned students and staff, not unrelated students', () => {
  const ids = contactsFor({ users }, users[2]).map(person => person.id);
  assert.deepEqual(ids, ['student-a', 'host-a', 'host-b', 'admin']);
});

test('messages explain backend limitations and role-scoped subtitles even when no contacts are available', () => {
  const view = readFileSync(new URL('../src/views/Messages.jsx', import.meta.url), 'utf8');
  assert.match(view, /messages-banner/);
  assert.match(view, /Messages are read-only until the backend is connected/);
  assert.match(view, /Conversations with students and staff permitted for your college/);
  assert.match(view, /Conversations with interns and coordinators assigned to your company/);
  assert.match(view, /Sending is unavailable until the backend is connected/);
});

test('host representative messages handle empty contacts with company-specific guidance', () => {
  const view = readFileSync(new URL('../src/views/Messages.jsx', import.meta.url), 'utf8');
  assert.match(view, /Contacts will appear when interns or college coordinators are assigned to your company/);
});

test('admin contacts include every recorded staff and student account except the admin themself', () => {
  const ids = contactsFor({ users }, users[6]).map(person => person.id);
  assert.deepEqual(ids, ['student-a', 'student-b', 'coord-a', 'coord-b', 'host-a', 'host-b']);
});

test('admin messages show a university-wide directory overview and admin-specific empty guidance', () => {
  const view = readFileSync(new URL('../src/views/Messages.jsx', import.meta.url), 'utf8');
  assert.match(view, /University-wide messaging directory/);
  assert.match(view, /OJT coordinators/);
  assert.match(view, /Student interns/);
  assert.match(view, /Contacts appear when other staff or student accounts are recorded/);
  const css = readFileSync(new URL('../src/views/messages.css', import.meta.url), 'utf8');
  assert.match(css, /messages-directory/);
  assert.match(css, /@media \(min-width: 640px\)/);
});

test('contact count renders numeric zero instead of passing it through status resolution', () => {
  const view = readFileSync(new URL('../src/views/Messages.jsx', import.meta.url), 'utf8');
  assert.match(view, /className="ds-badge ds-tone--neutral" aria-label=\{`\$\{contacts\.length\} contacts`\}>\{contacts\.length\}<\/span>/);
  assert.doesNotMatch(view, /StatusBadge tone="neutral">\{contacts\.length\}/);
});


test('message layout uses responsive flex/grid sizing without viewport-height subtraction hacks', () => {
  const view = readFileSync(new URL('../src/views/Messages.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/views/messages.css', import.meta.url), 'utf8');
  assert.match(view, /messages-feedback/);
  assert.match(view, /messages-compose/);
  assert.match(view, /Host company representative/);
  assert.doesNotMatch(view, /h-\[calc\(100dvh/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /min-height: 44px/);
});
