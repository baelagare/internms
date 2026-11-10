import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dashboardSummary, statusTone } from '../src-react/services/studentDashboard.js';
const seed = () => JSON.parse(readFileSync(new URL('../database.json', import.meta.url), 'utf8'));
test('dashboard uses verified hours and separate milestone progress', () => {
  const db = seed(), student = db.users.find(item => item.id === 'student');
  const result = dashboardSummary(student, db);
  assert.equal(result.hours, 48); assert.equal(result.percent, 14.8);
  assert.equal(result.steps.filter(item => item.status === 'Completed').length, 4);
  assert.equal(result.steps[5].status, 'In Progress');
  db.logs.push({ studentId: student.id, status: 'Pending Supervisor Verification', hours: 100 });
  assert.equal(dashboardSummary(student, db).hours, 48);
  db.logs.at(-1).status = 'Coordinator Approved';
  assert.equal(dashboardSummary(student, db).hours, 148);
});
test('missing collections are not fabricated zero progress', () => {
  const result = dashboardSummary({ id: 'new', name: 'New Student' }, {});
  assert.equal(result.hours, null); assert.equal(result.quota, null); assert.equal(result.required, null);
  assert.equal(result.percent, null); assert.equal(result.evaluation, undefined);
  assert.equal(result.steps.filter(item => item.status === 'Completed').length, 0);
});
test('known zero progress and returned documents are distinct', () => {
  const user = { id: 'new', college: 'CITE', preDeploymentDocs: [{ status: 'Returned for Revision' }, { status: 'Not Uploaded' }] };
  const result = dashboardSummary(user, { logs: [], collegeSettings: { CITE: { requiredHours: 400 } } });
  assert.equal(result.percent, 0); assert.equal(result.required, 2);
  assert.equal(result.steps[1].status, 'Requires Attention');
  assert.equal(statusTone(result.steps[1].status), 'warning');
});
test('student IDs take precedence over matching names for evaluations and advisories', () => {
  const user = { id: 'one', name: 'Same Name' };
  const result = dashboardSummary(user, { evaluations: [{ studentId: 'two', studentName: user.name }], alerts: [{ id: 1, studentId: 'two', student: user.name }, { id: 2, studentId: user.id, status: 'Dismissed' }, { id: 3, studentId: user.id, status: 'Dispatched' }] });
  assert.equal(result.evaluation, undefined); assert.deepEqual(result.alerts.map(item => item.id), [3]);
});
test('passing evaluation never grants clearance and hour completion is dynamic', () => {
  const db = seed(), user = db.users.find(item => item.id === 'student');
  db.collegeSettings.CITE.requiredHours = 40;
  const result = dashboardSummary(user, db);
  assert.equal(result.steps[4].status, 'Completed'); assert.equal(result.steps[5].status, 'In Progress');
  assert.equal(result.percent, 120);
});
