import test from 'node:test';
import assert from 'node:assert/strict';
import { studentDashboardModel } from '../src/services/studentDashboard.js';

const emptyDb = () => ({ users: [], logs: [], collegeSettings: {}, evaluations: [], alerts: [] });

// Opaque ownership keys test isolation without demo accounts, names or browser sessions.
const ownershipKey = Symbol('ownership');

test('dashboard model reports unknown requirements and progress for a student without records', () => {
  const model = studentDashboardModel({ id: ownershipKey, role: 'student' }, emptyDb());
  assert.equal(model.available, true);
  assert.equal(model.required, null);
  assert.equal(model.verified, null);
  assert.equal(model.hours, 0);
  assert.equal(model.quota, null);
  assert.equal(model.evaluation, null);
  assert.equal(model.action, null);
  assert.deepEqual(model.advisories, []);
});

test('dashboard does not infer that missing log collections mean zero credited hours', () => {
  const db = emptyDb(); delete db.logs;
  const model = studentDashboardModel({ id: ownershipKey, role: 'student' }, db);
  assert.equal(model.hours, null);
});

test('dashboard displays an assigned checklist accurately and suggests a next action only from recorded requirements', () => {
  const user = { id: ownershipKey, role: 'student', placementStatus: 'Unplaced', preDeploymentDocs: [
    { status: 'Verified' }, { status: 'Verified' }
  ] };
  const model = studentDashboardModel(user, emptyDb());
  assert.equal(model.required, 2);
  assert.equal(model.verified, 2);
  assert.equal(model.action.route, 'placement');
});

test('dashboard only shows dispatched advisories with a final message', () => {
  const user = { id: ownershipKey, role: 'student' };
  const db = emptyDb();
  db.alerts = [
    { studentId: ownershipKey, hitlStatus: 'Draft', draftMessage: '[PLACEHOLDER]' },
    { studentId: ownershipKey, hitlStatus: 'Dispatched', finalDispatchedText: '[PLACEHOLDER]' },
    { studentId: ownershipKey, hitlStatus: 'Not Dispatched', finalDispatchedText: '[PLACEHOLDER]' },
    { studentId: ownershipKey, hitlStatus: 'Dismissed', finalDispatchedText: '[PLACEHOLDER]' },
    { studentId: Symbol(), hitlStatus: 'Dispatched', finalDispatchedText: '[PLACEHOLDER]' }
  ];
  const model = studentDashboardModel(user, db);
  assert.equal(model.advisories.length, 1);
  assert.equal(model.advisories[0].finalDispatchedText, '[PLACEHOLDER]');
});

test('dashboard does not claim missing clearance when an evaluation has coordinator status', () => {
  const user = { id: ownershipKey, role: 'student' };
  const db = emptyDb();
  db.evaluations = [{ studentId: ownershipKey, coordinatorClearanceStatus: 'Cleared & Certified' }];
  db.collegeSettings = {};
  user.placementStatus = 'Approved & Deployed';
  const model = studentDashboardModel(user, db);
  assert.equal(model.clearanceStatus, 'Cleared & Certified');
  assert.equal(model.action, null);
});

test('missing identity never receives anonymous records', () => {
  assert.deepEqual(studentDashboardModel({}, emptyDb()), { available: false });
  assert.deepEqual(studentDashboardModel(null, null), { available: false });
  const db = emptyDb();
  db.evaluations = [{}];
  db.logs = [{ status: 'Approved', hours: 1 }];
  const model = studentDashboardModel({ id: ownershipKey, role: 'student' }, db);
  assert.equal(model.evaluation, null);
  assert.equal(model.hours, 0);
});

test('invalid credited hours remain unknown and pending logs are not credited', () => {
  const user = { id: ownershipKey, role: 'student' };
  for (const hours of [null, undefined, '', ' ', false, -1, Infinity, 'invalid']) {
    assert.equal(studentDashboardModel(user, { ...emptyDb(), logs: [{ studentId: ownershipKey, status: 'Approved', hours }] }).hours, null);
  }
  assert.equal(studentDashboardModel(user, { ...emptyDb(), logs: [{ studentId: ownershipKey, status: 'Pending Supervisor Verification', hours: 1 }] }).hours, 0);
});

test('document corrections take priority without inferring eligibility or deadlines', () => {
  const model = studentDashboardModel({ id: ownershipKey, role: 'student', placementStatus: 'Approved & Deployed', preDeploymentDocs: [{ status: 'Returned for Revision' }] }, emptyDb());
  assert.equal(model.action.route, 'checklist');
  assert.equal(model.action.label, 'Review checklist');
});
test('recorded hours retain the existing credit stages and exclude other owners', () => {
  const model = studentDashboardModel({ id: ownershipKey, role: 'student' }, {
    ...emptyDb(), logs: [
      { studentId: ownershipKey, status: 'Supervisor Verified', hours: 1 },
      { studentId: ownershipKey, status: 'Coordinator Approved', hours: 1 },
      { studentId: Symbol(), status: 'Coordinator Approved', hours: 1 },
      { studentId: ownershipKey, status: 'Rejected', hours: 1 }
    ]
  });
  assert.equal(model.hours, 2);
});

test('empty and missing evaluation/advisory collections remain distinct', () => {
  const user = { id: ownershipKey, role: 'student' };
  const absent = studentDashboardModel(user, {});
  assert.equal(absent.evaluationsAvailable, false);
  assert.equal(absent.advisories, null);
  const empty = studentDashboardModel(user, emptyDb());
  assert.equal(empty.evaluationsAvailable, true);
  assert.deepEqual(empty.advisories, []);
});


