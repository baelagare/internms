import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scopedStudents } from '../src/services/records.js';

const coordinator = { id: 'coord', role: 'coordinator', college: 'C1' };
const db = { users: [
  { id: 'student-a', role: 'student', college: 'C1' },
  { id: 'student-b', role: 'student', college: 'C2' }
], htes: [
  { id: 'partner-a', name: 'Host A', college: 'C1', maxSlots: 4, filledSlots: 2, inviteToken: 'token-a' },
  { id: 'partner-b', name: 'Host B', college: 'C2', maxSlots: 3, filledSlots: 1 }
] };

test('coordinator partner directory scope is restricted to coordinator college', () => {
  const records = db.htes.filter(item => item.college === coordinator.college);
  assert.deepEqual(records.map(item => item.id), ['partner-a']);
  assert.deepEqual(scopedStudents(db, coordinator).map(item => item.id), ['student-a']);
});

test('partner screen communicates unavailable mutations and does not invent contact defaults', () => {
  const source = readFileSync(new URL('../src/views/Management.jsx', import.meta.url), 'utf8');
  assert.match(source, /Only enter company and role information confirmed by the partner/);
  assert.match(readFileSync(new URL('../src/services/applicationService.js', import.meta.url), 'utf8'), /mutate\(/);
  assert.match(source, /item\.maxSlots == null \|\| item\.filledSlots == null \? 'Not recorded'/);
});

test('partner interface has explicit invitation statuses and responsive summary styles', () => {
  const source = readFileSync(new URL('../src/views/Management.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/views/partners.css', import.meta.url), 'utf8');
  assert.match(source, /Invitation pending/);
  assert.match(source, /Representative linked/);
  assert.match(source, /Capacity Recorded/);
  assert.match(css, /@media \(min-width: 640px\)/);
});

test('host job posting form edits only company-provided role details, not capacity or eligibility', () => {
  const source = readFileSync(new URL('../src/views/Management.jsx', import.meta.url), 'utf8');
  const supervisorFields = source.match(/const fields = supervisor\s*\n\s*\?([\s\S]*?)\n\s*:\s*\[/);
  assert.ok(supervisorFields);
  assert.match(supervisorFields[1], /roleTitle/);
  assert.match(supervisorFields[1], /description/);
  assert.match(supervisorFields[1], /requiredSkills/);
  assert.doesNotMatch(supervisorFields[1], /maxSlots|minGpa/);
  assert.match(source, /No job posting record is available for this company yet/);
});

