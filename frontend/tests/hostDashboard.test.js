import test from 'node:test';
import assert from 'node:assert/strict';
import { hostDashboardModel } from '../src/services/hostDashboard.js';

const supervisor = { id: 'rep-1', role: 'supervisor', company: 'Host A' };
const makeDb = () => ({
  users: [
    { id: 'student-a', role: 'student', company: 'Host A', name: 'Student A' },
    { id: 'student-b', role: 'student', company: 'Host B', name: 'Student B' }
  ],
  logs: [
    { studentId: 'student-a', status: 'Pending Supervisor Verification', hours: 8 },
    { studentId: 'student-a', status: 'Supervisor Verified', hours: 10 },
    { studentId: 'student-b', status: 'Pending Supervisor Verification', hours: 99 }
  ],
  dtrDisputes: [{ studentId: 'student-a', status: 'Pending Supervisor Verification' }, { studentId: 'student-b', status: 'Pending Supervisor Verification' }],
  evaluations: [{ studentId: 'student-a', company: 'Host A' }, { studentId: 'student-b', company: 'Host B' }]
});

test('host dashboard scopes interns, reviews, and evaluations to the representative company', () => {
  const model = hostDashboardModel(makeDb(), supervisor);
  assert.equal(model.available, true);
  assert.equal(model.students.length, 1);
  assert.equal(model.pendingReports, 1);
  assert.equal(model.pendingAttendance, 1);
  assert.equal(model.completedEvaluations, 1);
  assert.equal(model.students[0].creditedHours, 10);
});

test('missing required data sources produce unavailable state rather than empty totals', () => {
  const db = makeDb();
  delete db.logs;
  assert.deepEqual(hostDashboardModel(db, supervisor), { available: false });
});

test('missing or invalid credited hours stay unknown instead of being counted as zero', () => {
  const db = makeDb();
  db.logs = [{ studentId: 'student-a', status: 'Supervisor Verified', hours: null }];
  assert.equal(hostDashboardModel(db, supervisor).students[0].creditedHours, null);
});
