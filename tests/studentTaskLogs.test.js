import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  filterTaskLogs,
  formatLogRecordType,
  getCompetencyOptionsForCollege,
  getDefaultNarrativeTemplate,
  getTaskLogsModuleOverview,
  getVerificationChainDetails,
  getWeekTaskSummary,
  loadNarrativeDraft,
  paginateTaskLogs,
  saveNarrativeDraft,
  submitWeeklyTaskReportTransaction,
  summarizeTaskLogs,
  taskStatusTone,
  validateWeeklyTaskReport
} from '../src-react/services/studentTaskLogs.js';
import { approvedHours, reviewTraining, studentLogs } from '../src-react/services/training.js';

const seed = JSON.parse(readFileSync(new URL('../database.json', import.meta.url)));
const fresh = () => structuredClone(seed);
const actor = (db, id) => db.users.find(user => user.id === id);

const SAMPLE_CAMERA_SNAPSHOT = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/';

test('getCompetencyOptionsForCollege returns college-specific competency outcomes', () => {
  const citeOptions = getCompetencyOptionsForCollege('CITE');
  assert.ok(citeOptions.length >= 4);
  assert.ok(citeOptions.some(item => item.startsWith('CS-PO3')));

  const fallbackOptions = getCompetencyOptionsForCollege('UNKNOWN');
  assert.ok(fallbackOptions.length >= 1);
});

test('getWeekTaskSummary calculates DTR reference hours and detects existing active reports', () => {
  const db = fresh();
  const student = actor(db, 'student');

  // Week 6 in seed data has 2 DTR attendance logs (8 + 8 = 16 hrs) and 1 weekly_task report (40 hrs, Supervisor Verified)
  const week6 = getWeekTaskSummary(db, student, 6);
  assert.equal(week6.dtrDaysCount, 2);
  assert.equal(week6.dtrRecordedHours, 16);
  assert.equal(week6.dtrVerifiedHours, 8);
  assert.ok(week6.existingActiveReport);
  assert.equal(week6.existingActiveReport.status, 'Supervisor Verified');

  // Week 7 has no weekly_task report yet
  const week7 = getWeekTaskSummary(db, student, 7);
  assert.equal(week7.existingActiveReport, null);
});

test('validateWeeklyTaskReport enforces field bounds and live camera snapshot', () => {
  const missingAll = validateWeeklyTaskReport({});
  assert.ok(missingAll.weekNumber);
  assert.ok(missingAll.hours);
  assert.ok(missingAll.competencyTag);
  assert.ok(missingAll.title);
  assert.ok(missingAll.description);
  assert.ok(missingAll.snapshot);

  const valid = validateWeeklyTaskReport({
    weekNumber: 7,
    hours: 40,
    competencyTag: 'CS-PO3: Design, Implement & Evaluate Computing Systems',
    title: 'Week 7 API Hardening & RBAC',
    description: 'Implemented role-based access control middleware and unit test coverage.',
    snapshot: SAMPLE_CAMERA_SNAPSHOT
  });
  assert.deepEqual(valid, {});
});

test('submitWeeklyTaskReportTransaction rejects file upload metadata substitutes and missing camera evidence', () => {
  const db = fresh();
  const student = actor(db, 'student');

  assert.throws(
    () =>
      submitWeeklyTaskReportTransaction(db, student, {
        weekNumber: 7,
        hours: 40,
        competencyTag: 'CS-PO3',
        title: 'Valid Accomplishment Title',
        description: 'Valid detailed description of weekly work completed.',
        snapshot: SAMPLE_CAMERA_SNAPSHOT,
        attachmentName: 'uploaded_document.pdf'
      }),
    /File uploads are not permitted/
  );

  assert.throws(
    () =>
      submitWeeklyTaskReportTransaction(db, student, {
        weekNumber: 7,
        hours: 40,
        competencyTag: 'CS-PO3',
        title: 'Valid Accomplishment Title',
        description: 'Valid detailed description of weekly work completed.',
        snapshot: ''
      }),
    /Capture live camera task evidence/
  );
});

test('submitWeeklyTaskReportTransaction records Pending Supervisor Verification without inflating approvedHours', () => {
  const db = fresh();
  const student = actor(db, 'student');
  const beforeApproved = approvedHours(db, student);

  const record = submitWeeklyTaskReportTransaction(db, student, {
    weekNumber: 7,
    hours: 40,
    competencyTag: 'CS-PO3: Design, Implement & Evaluate Computing Systems',
    title: 'Week 7 Competency Accomplishment: Live Camera Task Workflow',
    description: 'Built and tested the live camera evidence capture workflow for weekly task logs.',
    snapshot: SAMPLE_CAMERA_SNAPSHOT
  });

  assert.equal(record.status, 'Pending Supervisor Verification');
  assert.equal(record.photo, SAMPLE_CAMERA_SNAPSHOT);
  assert.equal(record.evidenceSource, 'live_camera');
  assert.equal(approvedHours(db, student), beforeApproved);
});

test('submitWeeklyTaskReportTransaction blocks duplicate active week submission and allows revision resubmission', () => {
  const db = fresh();
  const student = actor(db, 'student');

  // Week 6 already has an active report in seed data
  assert.throws(
    () =>
      submitWeeklyTaskReportTransaction(db, student, {
        weekNumber: 6,
        hours: 40,
        competencyTag: 'CS-PO3',
        title: 'Duplicate Week 6 Report',
        description: 'Attempting to submit a second active report for Week 6.',
        snapshot: SAMPLE_CAMERA_SNAPSHOT
      }),
    /already on record/
  );

  // Submit Week 7, then have supervisor return it for revision, then resubmit Week 7
  const created = submitWeeklyTaskReportTransaction(db, student, {
    weekNumber: 7,
    hours: 40,
    competencyTag: 'CS-PO3',
    title: 'Initial Week 7 Report',
    description: 'Initial summary of work before supervisor revision request.',
    snapshot: SAMPLE_CAMERA_SNAPSHOT
  });

  reviewTraining(db, actor(db, 'supervisor'), 'log', created.id, student.id, false, 'Please expand the testing metrics.');
  assert.equal(created.status, 'Returned for Revision');

  const resubmitted = submitWeeklyTaskReportTransaction(db, student, {
    weekNumber: 7,
    hours: 36,
    competencyTag: 'CS-PO3',
    title: 'Revised Week 7 Report with Metrics',
    description: 'Expanded summary including 73 passing unit tests and coverage report.',
    snapshot: SAMPLE_CAMERA_SNAPSHOT
  });

  assert.equal(resubmitted.id, created.id);
  assert.equal(resubmitted.status, 'Pending Supervisor Verification');
  assert.equal(resubmitted.hours, 36);
  assert.equal(resubmitted.auditTrail.length, 2);
});

test('filterTaskLogs searches human-readable fields and ignores base64/SVG photo data', () => {
  const db = fresh();
  const student = actor(db, 'student');
  const logs = studentLogs(db, student);

  // Seed logs contain SVG data URLs in `photo` (with <svg>, <rect>, base64 tokens)
  const falsePositiveCheck = filterTaskLogs(logs, { query: 'data:image' });
  assert.equal(falsePositiveCheck.length, 0);

  const svgTagCheck = filterTaskLogs(logs, { query: '<rect' });
  assert.equal(svgTagCheck.length, 0);

  // Targeted search matches title, competency, or remarks
  const sbertMatch = filterTaskLogs(logs, { query: 'SBERT Vector' });
  assert.equal(sbertMatch.length, 1);
  assert.equal(sbertMatch[0].kind, 'weekly_task');

  // Record type filter separates weekly_task from attendance
  const weeklyOnly = filterTaskLogs(logs, { recordType: 'weekly_task' });
  assert.equal(weeklyOnly.length, 1);
  assert.equal(formatLogRecordType(weeklyOnly[0]).label, 'Weekly Report');

  const dtrOnly = filterTaskLogs(logs, { recordType: 'attendance' });
  assert.equal(dtrOnly.length, 2);
  assert.equal(formatLogRecordType(dtrOnly[0]).label, 'Daily DTR Log');

  // Status filter
  const approvedOnly = filterTaskLogs(logs, { status: 'Coordinator Approved' });
  assert.equal(approvedOnly.length, 1);
});

test('taskStatusTone, summarizeTaskLogs, and paginateTaskLogs compute accurate presentation metadata', () => {
  const db = fresh();
  const student = actor(db, 'student');
  const logs = studentLogs(db, student);

  assert.equal(taskStatusTone('Coordinator Approved'), 'success');
  assert.equal(taskStatusTone('Supervisor Verified'), 'blue');
  assert.equal(taskStatusTone('Pending Supervisor Verification'), 'warning');
  assert.equal(taskStatusTone('Returned for Revision'), 'danger');

  const summary = summarizeTaskLogs(logs);
  assert.equal(summary.totalCount, 3);
  assert.equal(summary.weeklyReportCount, 1);
  assert.equal(summary.attendanceLogCount, 2);
  assert.equal(summary.reportedHoursTotal, 56);
  assert.equal(summary.verifiedOrApprovedHoursTotal, 48);
  assert.equal(summary.pendingHoursTotal, 8);

  const page1 = paginateTaskLogs(logs, 1, 8);
  assert.equal(page1.totalPages, 1);
  assert.equal(page1.items.length, 3);
});

test('getVerificationChainDetails builds 3-stage verification pipeline, hours attribution, and audit events across states', () => {
  const db = fresh();
  const student = actor(db, 'student');
  const supervisor = actor(db, 'supervisor');
  const coordinator = db.users.find(
    user => user.role === 'coordinator' && user.college === student.college
  );

  // 1. Newly submitted Pending Supervisor Verification report
  const submitted = submitWeeklyTaskReportTransaction(db, student, {
    weekNumber: 7,
    hours: 40,
    competencyTag: 'CS-PO3: Design, Implement & Evaluate Computing Systems',
    title: 'Week 7 API Verification Test',
    description: 'Implemented end-to-end verification pipeline and camera evidence preview.',
    snapshot: SAMPLE_CAMERA_SNAPSHOT
  });

  const pendingChain = getVerificationChainDetails(submitted);
  assert.equal(pendingChain.isCredited, false);
  assert.equal(pendingChain.reportedHours, 40);
  assert.equal(pendingChain.creditedHours, 0);
  assert.equal(pendingChain.hasCameraEvidence, true);
  assert.equal(pendingChain.steps.length, 3);
  assert.equal(pendingChain.steps[0].state, 'completed');
  assert.equal(pendingChain.steps[1].state, 'active');
  assert.equal(pendingChain.steps[2].state, 'waiting');

  // 2. Supervisor Verified state
  reviewTraining(db, supervisor, 'log', submitted.id, student.id, true, 'Verified on-site code deliverables.');
  const verifiedChain = getVerificationChainDetails(submitted);
  assert.equal(verifiedChain.isCredited, true);
  assert.equal(verifiedChain.creditedHours, 40);
  assert.equal(verifiedChain.steps[1].state, 'completed');
  assert.equal(verifiedChain.steps[1].actor, supervisor.name);
  assert.equal(verifiedChain.steps[2].state, 'active');

  // 3. Coordinator Approved state
  reviewTraining(db, coordinator, 'log', submitted.id, student.id, true, 'Approved for CITE OJT credit.');
  const approvedChain = getVerificationChainDetails(submitted);
  assert.equal(approvedChain.isCoordinatorApproved, true);
  assert.equal(approvedChain.creditedHours, 40);
  assert.equal(approvedChain.steps[2].state, 'completed');
  assert.equal(approvedChain.steps[2].actor, coordinator.name);
  assert.ok(approvedChain.auditEvents.some(e => e.event === 'COORDINATOR APPROVED'));

  // 4. Returned for Revision state
  const week8 = submitWeeklyTaskReportTransaction(db, student, {
    weekNumber: 8,
    hours: 32,
    competencyTag: 'CS-PO3',
    title: 'Week 8 Draft Report',
    description: 'Initial draft summary before supervisor feedback.',
    snapshot: SAMPLE_CAMERA_SNAPSHOT
  });
  reviewTraining(db, supervisor, 'log', week8.id, student.id, false, 'Attach clearer workstation evidence.');
  const returnedChain = getVerificationChainDetails(week8);
  assert.equal(returnedChain.isReturned, true);
  assert.equal(returnedChain.isCredited, false);
  assert.equal(returnedChain.creditedHours, 0);
  assert.equal(returnedChain.steps[1].state, 'returned');
});

test('getTaskLogsModuleOverview computes accurate KPI metrics for Component 4 page hierarchy', () => {
  const db = fresh();
  const student = actor(db, 'student');
  const overview = getTaskLogsModuleOverview(db, student);

  assert.equal(overview.approvedOjtHours, 48);
  assert.equal(overview.requiredQuota, 324);
  assert.equal(overview.quotaPercent, 15);
  assert.equal(overview.totalLogsCount, 3);
  assert.equal(overview.weeklyReportsSubmitted, 1);
  assert.equal(overview.weeklyReportsVerified, 1);
  assert.equal(overview.pendingReviewCount, 1);
  assert.equal(overview.pendingReviewHours, 8);
  assert.equal(overview.distinctCompetenciesCount, 3);
  assert.equal(overview.distinctWeeksLogged, 1);
  assert.equal(overview.company, student.company);
});

test('loadNarrativeDraft and saveNarrativeDraft persist session narrative sections and fallback to student template', () => {
  const db = fresh();
  const student = actor(db, 'student');

  const store = new Map();
  const mockStorage = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, val) => store.set(key, val)
  };

  const initial = loadNarrativeDraft(student, mockStorage);
  assert.equal(initial.isSavedDraft, false);
  assert.ok(initial.intro.includes(student.company));
  assert.ok(initial.reflection.includes('Python & FastAPI'));

  saveNarrativeDraft(
    student,
    {
      intro: 'Custom Section I overview for NEMSU SIPP.',
      reflection: 'Custom Section II reflection on SBERT and RAG engineering.'
    },
    mockStorage
  );

  const reloaded = loadNarrativeDraft(student, mockStorage);
  assert.equal(reloaded.isSavedDraft, true);
  assert.equal(reloaded.intro, 'Custom Section I overview for NEMSU SIPP.');
  assert.equal(reloaded.reflection, 'Custom Section II reflection on SBERT and RAG engineering.');

  const defaults = getDefaultNarrativeTemplate(student);
  assert.ok(defaults.intro.includes(student.assignedRole));
});
