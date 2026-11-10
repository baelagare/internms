import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  calculateDailyHours,
  calculateIntervalHours,
  dailyAttendanceState,
  filterAdjustmentRecords,
  filterDtrRecords,
  formatDateDisplay,
  formatTime12,
  getAvailableReportingPeriods,
  getDailyAttendanceLog,
  ojtHoursOverview,
  parseTimeToMinutes,
  recordAttendancePunchTransaction,
  submitAdjustmentTransaction
} from '../src-react/services/studentAttendance.js';
import { approvedHours } from '../src-react/services/training.js';

const seed = JSON.parse(readFileSync(new URL('../database.json', import.meta.url)));
const fresh = () => structuredClone(seed);
const getStudent = db => db.users.find(u => u.id === 'student');

test('ojtHoursOverview calculates accurate approved, quota, remaining, and pending metrics', () => {
  const db = fresh();
  const student = getStudent(db);
  const overview = ojtHoursOverview(db, student);
  assert.equal(overview.required, 324);
  assert.equal(overview.approved, 48);
  assert.equal(overview.coordinatorApproved, 8);
  assert.equal(overview.supervisorVerified, 40);
  assert.equal(overview.pendingVerification, 8);
  assert.equal(overview.totalRecorded, 56);
  assert.equal(overview.remaining, 276);
  assert.equal(overview.percent, 14.8);
});

test('time parsing and interval calculations handle 12-hour AM/PM formats', () => {
  assert.equal(parseTimeToMinutes('08:00 AM'), 480);
  assert.equal(parseTimeToMinutes('12:00 PM'), 720);
  assert.equal(parseTimeToMinutes('01:00 PM'), 780);
  assert.equal(parseTimeToMinutes('05:00 PM'), 1020);
  assert.equal(parseTimeToMinutes('-'), null);
  assert.equal(parseTimeToMinutes(''), null);

  assert.equal(calculateIntervalHours('08:00 AM', '12:00 PM', 4.0), 4.0);
  assert.equal(calculateIntervalHours('01:00 PM', '05:00 PM', 4.0), 4.0);
  assert.equal(calculateIntervalHours('08:00 AM', '10:30 AM', 4.0), 2.5);
  assert.equal(calculateIntervalHours('12:00 PM', '08:00 AM', 4.0), 0);
});

test('calculateDailyHours sums valid session intervals excluding lunch break', () => {
  const fullDay = calculateDailyHours('08:00 AM', '12:00 PM', '01:00 PM', '05:00 PM');
  assert.equal(fullDay, 8.0);

  const morningOnly = calculateDailyHours('08:00 AM', '12:00 PM', '-', '-');
  assert.equal(morningOnly, 4.0);

  const afternoonOnly = calculateDailyHours('-', '-', '01:00 PM', '05:00 PM');
  assert.equal(afternoonOnly, 4.0);

  const unclosed = calculateDailyHours('08:00 AM', '-', '-', '-');
  assert.equal(unclosed, 0);
});

test('dailyAttendanceState manages sequential punch state machine', () => {
  const state0 = dailyAttendanceState(null);
  assert.equal(state0.statusLabel, 'Ready to Clock In');
  assert.equal(state0.nextPunch, 'AM_IN');
  assert.equal(state0.completedPunches, 0);

  const state1 = dailyAttendanceState({
    amIn: '08:04 AM',
    amOut: '-',
    pmIn: '-',
    pmOut: '-'
  });
  assert.equal(state1.statusLabel, 'Morning Session in Progress');
  assert.equal(state1.nextPunch, 'AM_OUT');
  assert.equal(state1.completedPunches, 1);

  const state2 = dailyAttendanceState({
    amIn: '08:04 AM',
    amOut: '12:02 PM',
    pmIn: '-',
    pmOut: '-'
  });
  assert.equal(state2.statusLabel, 'AM Session Completed');
  assert.equal(state2.nextPunch, 'PM_IN');
  assert.equal(state2.completedPunches, 2);

  const state3 = dailyAttendanceState({
    amIn: '08:04 AM',
    amOut: '12:02 PM',
    pmIn: '01:00 PM',
    pmOut: '-'
  });
  assert.equal(state3.statusLabel, 'Afternoon Session in Progress');
  assert.equal(state3.nextPunch, 'PM_OUT');
  assert.equal(state3.completedPunches, 3);

  const state4 = dailyAttendanceState({
    amIn: '08:04 AM',
    amOut: '12:02 PM',
    pmIn: '01:00 PM',
    pmOut: '05:03 PM',
    hours: 8
  });
  assert.equal(state4.statusLabel, 'Daily Attendance Completed');
  assert.equal(state4.nextPunch, null);
  assert.equal(state4.completedPunches, 4);
});

test('recordAttendancePunchTransaction records sequential camera punches and updates DTR immediately', () => {
  const db = fresh();
  const student = getStudent(db);
  const testDate = '2026-11-10';
  const snapshot = 'data:image/jpeg;base64,/9j/test_snapshot';
  const initialApproved = approvedHours(db, student);

  const log1 = recordAttendancePunchTransaction(db, student, {
    punchType: 'AM_IN',
    dateStr: testDate,
    timeStr: '08:02 AM',
    snapshot,
    workSummary: 'Sprint 6 Standup & Index Optimization'
  });

  assert.equal(log1.date, testDate);
  assert.equal(log1.amIn, '08:02 AM');
  assert.equal(log1.amOut, '-');
  assert.equal(log1.status, 'Pending Supervisor Verification');
  assert.equal(log1.hours, 0);
  assert.equal(log1.photo, snapshot);
  assert.equal(log1.auditTrail.length, 1);
  assert.equal(log1.auditTrail[0].event, 'AM_IN');

  // Newly punched hours do not count toward approved hours yet
  assert.equal(approvedHours(db, student), initialApproved);

  // Duplicate AM_IN rejected
  assert.throws(() => {
    recordAttendancePunchTransaction(db, student, {
      punchType: 'AM_IN',
      dateStr: testDate,
      timeStr: '08:05 AM'
    });
  }, /already been recorded/);

  // Premature PM_OUT rejected without PM_IN
  assert.throws(() => {
    recordAttendancePunchTransaction(db, student, {
      punchType: 'PM_OUT',
      dateStr: testDate,
      timeStr: '05:00 PM'
    });
  }, /without prior PM Time In/);

  // Step 2: AM_OUT
  const log2 = recordAttendancePunchTransaction(db, student, {
    punchType: 'AM_OUT',
    dateStr: testDate,
    timeStr: '12:02 PM',
    snapshot
  });
  assert.equal(log2.amOut, '12:02 PM');
  assert.equal(log2.hours, 4.0);

  // Step 3: PM_IN
  const log3 = recordAttendancePunchTransaction(db, student, {
    punchType: 'PM_IN',
    dateStr: testDate,
    timeStr: '01:01 PM'
  });
  assert.equal(log3.pmIn, '01:01 PM');
  assert.equal(log3.hours, 4.0);

  // Step 4: PM_OUT
  const log4 = recordAttendancePunchTransaction(db, student, {
    punchType: 'PM_OUT',
    dateStr: testDate,
    timeStr: '05:04 PM'
  });
  assert.equal(log4.pmOut, '05:04 PM');
  assert.equal(log4.hours, 8.0);
  assert.equal(log4.status, 'Pending Supervisor Verification');
  assert.equal(log4.auditTrail.length, 4);

  // Approved hours remains 48 until supervisor verification
  assert.equal(approvedHours(db, student), 48);
});

test('submitAdjustmentTransaction validates bounds and stores dispute', () => {
  const db = fresh();
  const student = getStudent(db);

  assert.throws(() => {
    submitAdjustmentTransaction(db, student, {
      targetDate: '2099-01-01',
      requestedHours: 8,
      reason: 'Valid length justification for testing.'
    });
  }, /future dates/);

  assert.throws(() => {
    submitAdjustmentTransaction(db, student, {
      targetDate: '2026-10-25',
      requestedHours: 15,
      reason: 'Valid length justification for testing.'
    });
  }, /between 1 and 12/);

  assert.throws(() => {
    submitAdjustmentTransaction(db, student, {
      targetDate: '2026-10-25',
      requestedHours: 8,
      reason: 'Short'
    });
  }, /at least 10 characters/);

  const dispute = submitAdjustmentTransaction(db, student, {
    targetDate: '2026-10-25',
    requestedHours: 8,
    reasonCategory: 'Off-site / Field Client Assignment',
    reason: 'Deployed with Engr. Elena Rostova to isolated server room without connectivity.',
    requestedAmIn: '08:00 AM',
    requestedAmOut: '12:00 PM',
    requestedPmIn: '01:00 PM',
    requestedPmOut: '05:00 PM'
  });

  assert.ok(dispute.id.startsWith('DISP-'));
  assert.equal(dispute.targetDate, '2026-10-25');
  assert.equal(dispute.requestedHours, 8);
  assert.equal(dispute.status, 'Pending Supervisor Verification');
  assert.equal(dispute.attachmentName, null);

  // Duplicate pending request for same date rejected
  assert.throws(() => {
    submitAdjustmentTransaction(db, student, {
      targetDate: '2026-10-25',
      requestedHours: 8,
      reason: 'Another duplicate request attempt.'
    });
  }, /already pending supervisor verification/);
});

test('filter helpers correctly filter records', () => {
  const db = fresh();
  const student = getStudent(db);
  const logs = db.logs.filter(l => l.studentId === student.id);

  const octRecords = filterDtrRecords(logs, { period: '2026-10', status: 'ALL', query: '' });
  assert.ok(octRecords.every(r => r.date.startsWith('2026-10')));

  const approvedRecords = filterDtrRecords(logs, { period: 'ALL', status: 'APPROVED', query: '' });
  assert.ok(approvedRecords.every(r => ['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(r.status)));

  const queryRecords = filterDtrRecords(logs, { period: 'ALL', status: 'ALL', query: 'SBERT' });
  assert.ok(queryRecords.length > 0);

  const disputes = db.dtrDisputes || [];
  const filteredDisputes = filterAdjustmentRecords(disputes, { status: 'ALL', query: 'GatePass' });
  assert.ok(filteredDisputes.length > 0);
});