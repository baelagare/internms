import test from 'node:test';
import assert from 'node:assert/strict';
import { hostInternsModel } from '../src/services/hostInterns.js';
import { readFileSync } from 'node:fs';

const user = { id: 'rep', role: 'supervisor', company: 'Host A' };
const db = () => ({
  users: [
    { id: 'student-a', role: 'student', name: 'Student A', company: 'Host A' },
    { id: 'student-b', role: 'student', name: 'Student B', company: 'Host B' }
  ],
  logs: [
    { studentId: 'student-a', status: 'Supervisor Verified', hours: 10 },
    { studentId: 'student-a', status: 'Pending Supervisor Verification', hours: 2 },
    { studentId: 'student-b', status: 'Pending Supervisor Verification', hours: 9 }
  ],
  dtrDisputes: [{ studentId: 'student-a', status: 'Pending Supervisor Verification' }, { studentId: 'student-b', status: 'Pending Supervisor Verification' }],
  evaluations: [{ studentId: 'student-a', company: 'Host A' }, { studentId: 'student-b', company: 'Host B' }]
});

test('host intern list includes only students assigned to the representative company', () => {
  const model = hostInternsModel(db(), user);
  assert.deepEqual(model.students.map(item => item.id), ['student-a']);
  assert.equal(model.students[0].creditedHours, 10);
  assert.equal(model.students[0].pendingReports, 1);
  assert.equal(model.students[0].pendingAttendance, 1);
});

test('host intern records mark missing sources and hours unavailable', () => {
  const records = db();
  delete records.logs;
  const model = hostInternsModel(records, user);
  assert.equal(model.students[0].hoursAvailable, false);
  assert.equal(model.students[0].creditedHours, null);
  assert.equal(model.students[0].pendingReports, null);
});

test('host intern view avoids institutional clearance and evaluation score details', () => {
  const view = readFileSync(new URL('../src/views/HostInternDirectory.jsx', import.meta.url), 'utf8');
  assert.match(view, /Assigned interns/);
  assert.match(view, /Evaluation/);
  assert.doesNotMatch(view, /Clearance|totalScore|averageRating/);
});
