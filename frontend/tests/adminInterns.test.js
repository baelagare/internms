import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { internDirectoryRecords } from '../src/services/internDirectory.js';

const view = readFileSync(new URL('../src/views/Interns.jsx', import.meta.url), 'utf8');
const internal = view.slice(view.indexOf('function InternalInternDirectory'));

test('admin intern directory labels the university view and shows the cohort summary', () => {
  assert.match(internal, /Student records across all colleges/);
  assert.match(internal, /user\.role === 'coordinator' \|\| admin/);
  assert.match(internal, /Students in scope/);
});

test('admin intern directory scopes the empty state to the selected college', () => {
  assert.match(internal, /No students in this college/);
  assert.match(internal, /Select a different college or adjust the search or placement filter/);
  assert.match(internal, /No student records yet/);
});

test('admin intern records follow the college scope without crossing into other colleges', () => {
  const db = {
    users: [
      { id: 's1', role: 'student', college: 'C1', name: 'Student 1' },
      { id: 's2', role: 'student', college: 'C2', name: 'Student 2' }
    ],
    collegeSettings: { C1: {}, C2: {} }
  };
  const admin = { id: 'admin', role: 'admin' };
  assert.deepEqual(internDirectoryRecords(db, admin, 'C1').students.map(student => student.id), ['s1']);
  assert.deepEqual(internDirectoryRecords(db, admin, 'ALL').students.map(student => student.id), ['s1', 's2']);
});
