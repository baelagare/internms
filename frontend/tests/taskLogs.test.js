import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterTaskLogs,
  getTaskLogsModuleOverview,
  getVerificationChainDetails,
  getWeekTaskSummary,
  summarizeTaskLogs,
  validateWeeklyTaskReport
} from '../src/services/studentTaskLogs.js';

test('validateWeeklyTaskReport validates field bounds and requires a live camera snapshot', () => {
  const valid = {
    weekNumber: 3,
    hours: 40,
    competencyTag: 'CS-PO1: Software Design',
    title: 'Sprint 3 API Design',
    description: 'Developed and tested RESTful endpoints for student clearance.',
    snapshot: 'data:image/jpeg;base64,samplephoto'
  };
  assert.deepEqual(validateWeeklyTaskReport(valid), {});

  // Invalid week number
  assert.ok(validateWeeklyTaskReport({ ...valid, weekNumber: 0 }).weekNumber);
  assert.ok(validateWeeklyTaskReport({ ...valid, weekNumber: 55 }).weekNumber);

  // Invalid hours (must be 1-60)
  assert.ok(validateWeeklyTaskReport({ ...valid, hours: 0 }).hours);
  assert.ok(validateWeeklyTaskReport({ ...valid, hours: 65 }).hours);

  // Short title (<5 chars)
  assert.ok(validateWeeklyTaskReport({ ...valid, title: 'API' }).title);

  // Short description (<15 chars)
  assert.ok(validateWeeklyTaskReport({ ...valid, description: 'Short note' }).description);

  // Missing or non-data URL snapshot
  assert.ok(validateWeeklyTaskReport({ ...valid, snapshot: '' }).snapshot);
  assert.ok(validateWeeklyTaskReport({ ...valid, snapshot: 'http://example.com/photo.jpg' }).snapshot);
});

test('getWeekTaskSummary calculates DTR reference hours and identifies existing reports', () => {
  const student = { id: 'stu-1' };
  const db = {
    collegeSettings: { CITE: { requiredHours: 324 } },
    logs: [
      { studentId: 'stu-1', weekNumber: 2, kind: 'attendance', status: 'Supervisor Verified', hours: 8 },
      { studentId: 'stu-1', weekNumber: 2, kind: 'attendance', status: 'Coordinator Approved', hours: 8 },
      { studentId: 'stu-1', weekNumber: 2, kind: 'weekly_task', status: 'Pending Supervisor Verification', hours: 16 }
    ]
  };

  const summary = getWeekTaskSummary(db, student, 2);
  assert.equal(summary.weekNumber, 2);
  assert.equal(summary.dtrDaysCount, 2);
  assert.equal(summary.dtrRecordedHours, 16);
  assert.equal(summary.dtrVerifiedHours, 16);
  assert.ok(summary.existingActiveReport);
  assert.equal(summary.existingActiveReport.hours, 16);
  assert.equal(summary.returnedReport, null);
});

test('getVerificationChainDetails constructs 3-stage review pipeline and attribution', () => {
  const pendingLog = {
    status: 'Pending Supervisor Verification',
    hours: 40,
    kind: 'weekly_task',
    photo: 'data:image/jpeg;base64,evidence'
  };
  const pendingDetails = getVerificationChainDetails(pendingLog);
  assert.equal(pendingDetails.steps.length, 3);
  assert.equal(pendingDetails.steps[0].state, 'completed'); // student submission done
  assert.equal(pendingDetails.steps[1].state, 'active'); // supervisor verification pending
  assert.equal(pendingDetails.steps[2].state, 'waiting'); // coordinator approval waiting
  assert.equal(pendingDetails.isCredited, false);
  assert.equal(pendingDetails.creditedHours, 0);

  const approvedLog = {
    status: 'Coordinator Approved',
    hours: 40,
    kind: 'weekly_task',
    supervisorVerifiedBy: 'Supervisor Jane',
    coordinatorApprovedBy: 'Coordinator Doe'
  };
  const approvedDetails = getVerificationChainDetails(approvedLog);
  assert.equal(approvedDetails.steps[0].state, 'completed');
  assert.equal(approvedDetails.steps[1].state, 'completed');
  assert.equal(approvedDetails.steps[2].state, 'completed');
  assert.equal(approvedDetails.isCredited, true);
  assert.equal(approvedDetails.creditedHours, 40);
});

test('getTaskLogsModuleOverview safely computes KPI overview metrics', () => {
  const student = { id: 'stu-2', company: 'Acme Corp', assignedRole: 'Backend Intern' };
  const db = {
    logs: [
      { studentId: 'stu-2', kind: 'weekly_task', status: 'Coordinator Approved', hours: 40, competencyTag: 'Web Systems' },
      { studentId: 'stu-2', kind: 'weekly_task', status: 'Pending Supervisor Verification', hours: 40, competencyTag: 'Database Systems' }
    ]
  };

  const overview = getTaskLogsModuleOverview(db, student);
  assert.equal(overview.totalLogsCount, 2);
  assert.equal(overview.weeklyReportsSubmitted, 2);
  assert.equal(overview.weeklyReportsVerified, 1);
  assert.equal(overview.pendingReviewCount, 1);
  assert.equal(overview.pendingReviewHours, 40);
  assert.equal(overview.distinctCompetenciesCount, 2);
  assert.equal(overview.company, 'Acme Corp');
});

test('filterTaskLogs filters and sorts task accomplishment logs', () => {
  const logs = [
    { id: '1', date: '2026-10-01', weekNumber: 1, kind: 'weekly_task', status: 'Coordinator Approved', title: 'Sprint 1 Review' },
    { id: '2', date: '2026-10-08', weekNumber: 2, kind: 'weekly_task', status: 'Returned for Revision', title: 'Sprint 2 Retrospective' }
  ];

  const returned = filterTaskLogs(logs, { status: 'Returned for Revision' });
  assert.equal(returned.length, 1);
  assert.equal(returned[0].id, '2');

  const search = filterTaskLogs(logs, { query: 'Sprint 1' });
  assert.equal(search.length, 1);
  assert.equal(search[0].id, '1');
});
