import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { coordinatorDashboardModel } from '../src/services/coordinatorDashboard.js';

const user = { id: 'coordinator-a', role: 'coordinator', college: 'C1' };
const database = () => ({
  users: [
    { id: 'student-a', role: 'student', college: 'C1', name: 'Student A', preDeploymentDocs: [{ status: 'Verified' }, { status: 'Pending' }] },
    { id: 'student-b', role: 'student', college: 'C2', name: 'Student B' }
  ],
  logs: [{ id: 'task-a', studentId: 'student-a', status: 'Supervisor Verified', hours: 10, title: 'Report' }, { id: 'task-b', studentId: 'student-b', status: 'Supervisor Verified', hours: 99 }],
  dtrDisputes: [{ id: 'dispute-a', studentId: 'student-a', status: 'Pending Coordinator Review' }],
  alerts: [{ studentId: 'student-a', status: 'Open' }, { studentId: 'student-b', status: 'Open' }],
  htes: [{ id: 'host-a', college: 'C1' }, { id: 'host-b', college: 'C2' }],
  evaluations: [{ studentId: 'student-a' }, { studentId: 'student-b' }],
  collegeSettings: { C1: { requiredHours: 300 } }
});

test('coordinator dashboard scopes cohort, workload, alerts and partner counts to college', () => {
  const model = coordinatorDashboardModel(database(), user);
  assert.equal(model.available, true);
  assert.equal(model.studentsCount, 1);
  assert.equal(model.partnersCount, 1);
  assert.equal(model.activeAlertsCount, 1);
  assert.equal(model.evaluationsCount, 1);
  assert.equal(model.students[0].hours, 10);
  assert.equal(model.pendingAttendanceAdjustments, 1);
  assert.equal(model.requiredHours, 300);
});

test('review queue contains only current coordinator-review stages and placement endorsements', () => {
  const db = database();
  db.logs.push({ id: 'await-supervisor', studentId: 'student-a', status: 'Pending Supervisor Verification' });
  db.logs.push({ id: 'rejected', studentId: 'student-a', status: 'Rejected' });
  db.users[0].placementStatus = 'Pending Coordinator Endorsement';
  const model = coordinatorDashboardModel(db, user);
  assert.deepEqual(model.pendingItems.map(item => item.type), ['Weekly report', 'Attendance adjustment', 'Placement preference']);
  assert.equal(model.pendingCount, 3);
});

test('missing sources are unavailable and missing checklist requirements remain unknown', () => {
  assert.equal(coordinatorDashboardModel({}, user).available, false);
  const db = database();
  db.users[0].preDeploymentDocs = null;
  db.collegeSettings.C1.requiredHours = undefined;
  const model = coordinatorDashboardModel(db, user);
  assert.equal(model.checklistsAvailable, false);
  assert.equal(model.students[0].checklist.required, null);
  assert.equal(model.requiredHours, null);
});

test('invalid/missing reported hours are excluded from credited aggregate without invented defaults', () => {
  const db = database();
  db.logs = [
    { studentId: 'student-a', status: 'Supervisor Verified', hours: null },
    { studentId: 'student-a', status: 'Coordinator Approved', hours: 4 }
  ];
  assert.equal(coordinatorDashboardModel(db, user).students[0].hours, 4);
});

test('coordinator dashboard section actions use consistent secondary button styling', () => {
  const source = readFileSync(new URL('../src/views/CoordinatorDashboard.jsx', import.meta.url), 'utf8');
  assert.match(source, /<Button variant="secondary" onClick=\{\(\) => onNavigate\?\.?\('approvals'\)\}>Open Approvals<\/Button>/);
  assert.match(source, /<Button variant="secondary" onClick=\{\(\) => onNavigate\?\.?\('interns'\)\}>View Interns<\/Button>/);
});

test('coordinator dashboard review queue links pass target parameters to open modals directly', () => {
  const source = readFileSync(new URL('../src/views/CoordinatorDashboard.jsx', import.meta.url), 'utf8');
  assert.match(source, /onNavigate\?\.?\(item\.route, \{ category: item\.category/);
});

