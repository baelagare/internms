import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { internDirectoryRecords } from '../src/services/internDirectory.js';

const coordinator = { id: 'coord', role: 'coordinator', college: 'C1' };
const sourceDb = () => ({
  users: [
    { id: 'student-a', role: 'student', college: 'C1', name: 'Student A', placementStatus: 'Approved & Deployed', preDeploymentDocs: [] },
    { id: 'student-b', role: 'student', college: 'C2', name: 'Student B' }
  ],
  logs: [{ studentId: 'student-a', status: 'Coordinator Approved', hours: 12 }, { studentId: 'student-b', status: 'Coordinator Approved', hours: 99 }],
  evaluations: [{ studentId: 'student-a', coordinatorClearanceStatus: 'Cleared & Certified' }],
  collegeSettings: { C1: { requiredHours: 300 }, C2: { requiredHours: 500 } }
});

test('coordinator intern directory only includes students in their college scope', () => {
  const model = internDirectoryRecords(sourceDb(), coordinator);
  assert.equal(model.available, true);
  assert.deepEqual(model.students.map(student => student.id), ['student-a']);
});

test('credited hours and clearance use recorded values and remain unavailable when sources are missing', () => {
  const db = sourceDb();
  const [student] = internDirectoryRecords(db, coordinator).students;
  assert.equal(student.directoryHours, 12);
  assert.equal(student.directoryQuota, 300);
  assert.equal(student.clearance, 'Cleared & Certified');
  delete db.logs;
  const missing = internDirectoryRecords(db, coordinator).students[0];
  assert.equal(missing.directoryHours, null);
  assert.equal(missing.hoursAvailable, false);
});

test('invalid credited hours remain unavailable instead of partial totals', () => {
  const db = sourceDb();
  db.logs = [{ studentId: 'student-a', status: 'Coordinator Approved', hours: 3 }, { studentId: 'student-a', status: 'Supervisor Verified', hours: null }];
  assert.equal(internDirectoryRecords(db, coordinator).students[0].directoryHours, null);
});

test('intern directory has accessible search, placement filtering and honest detail states', () => {
  const view = readFileSync(new URL('../src/views/Interns.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/views/interns.css', import.meta.url), 'utf8');
  assert.match(view, /Search students/);
  assert.match(view, /Placement status/);
  assert.match(view, /Student records/);
  assert.match(view, /Evaluation records are unavailable/);
  assert.match(css, /@media \(min-width: 640px\)/);
});
