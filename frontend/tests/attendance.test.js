import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDailyHours,
  dailyAttendanceState,
  filterAdjustmentRecords,
  filterDtrRecords,
  formatDateDisplay,
  formatTime12,
  getAvailableReportingPeriods,
  getTodayDateString,
  ojtHoursOverview,
  parseTimeIntervalMinutes,
  parseTimeToMinutes,
  PUNCH_CONFIG
} from '../src/services/studentAttendance.js';

test('parseTimeToMinutes parses 12-hour AM/PM formats accurately', () => {
  assert.equal(parseTimeToMinutes('08:00 AM'), 480);
  assert.equal(parseTimeToMinutes('12:00 PM'), 720);
  assert.equal(parseTimeToMinutes('01:00 PM'), 780);
  assert.equal(parseTimeToMinutes('05:00 PM'), 1020);
  assert.equal(parseTimeToMinutes('12:00 AM'), 0);
  assert.equal(parseTimeToMinutes('invalid'), null);
  assert.equal(parseTimeToMinutes('-'), null);
  assert.equal(parseTimeToMinutes(''), null);
});

test('parseTimeIntervalMinutes calculates elapsed minutes safely', () => {
  assert.equal(parseTimeIntervalMinutes('08:00 AM', '12:00 PM'), 240); // 4 hours
  assert.equal(parseTimeIntervalMinutes('01:00 PM', '05:00 PM'), 240); // 4 hours
  assert.equal(parseTimeIntervalMinutes('12:00 PM', '08:00 AM'), null); // Reversed
  assert.equal(parseTimeIntervalMinutes('08:00 AM', '08:00 AM'), null); // Zero elapsed
});

test('calculateDailyHours caps sessions at 4.0 hours and never manufactures hours for invalid times', () => {
  // Standard full-day 8 hours (4.0 AM + 4.0 PM)
  assert.equal(calculateDailyHours('08:00 AM', '12:00 PM', '01:00 PM', '05:00 PM'), 8.0);

  // Overtime session capped at 4.0 hours per shift
  assert.equal(calculateDailyHours('07:00 AM', '12:00 PM', '01:00 PM', '06:00 PM'), 8.0);

  // Partial session (2.5 AM + 0 PM)
  assert.equal(calculateDailyHours('08:00 AM', '10:30 AM', '-', '-'), 2.5);

  // Missing or invalid entries
  assert.equal(calculateDailyHours('', '', '', ''), 0.0);
  assert.equal(calculateDailyHours('-', '-', '-', '-'), 0.0);
  assert.equal(calculateDailyHours('invalid', '12:00 PM', '', ''), 0.0);
});

test('dailyAttendanceState advances through the 4-stage punch sequence', () => {
  // 1. Initial state (no punches yet)
  const initial = dailyAttendanceState(null);
  assert.equal(initial.currentStage, 'NOT_STARTED');
  assert.equal(initial.nextPunch, 'AM_IN');
  assert.equal(initial.completedPunches, 0);

  // 2. AM In recorded
  const amInDone = dailyAttendanceState({ amIn: '08:02 AM', amOut: '-', pmIn: '-', pmOut: '-' });
  assert.equal(amInDone.currentStage, 'AM_IN_RECORDED');
  assert.equal(amInDone.nextPunch, 'AM_OUT');
  assert.equal(amInDone.completedPunches, 1);

  // 3. Morning completed
  const amDone = dailyAttendanceState({ amIn: '08:02 AM', amOut: '12:01 PM', pmIn: '-', pmOut: '-' });
  assert.equal(amDone.currentStage, 'AM_SESSION_DONE');
  assert.equal(amDone.nextPunch, 'PM_IN');
  assert.equal(amDone.completedPunches, 2);

  // 4. Afternoon in progress
  const pmInDone = dailyAttendanceState({ amIn: '08:02 AM', amOut: '12:01 PM', pmIn: '01:05 PM', pmOut: '-' });
  assert.equal(pmInDone.currentStage, 'PM_IN_RECORDED');
  assert.equal(pmInDone.nextPunch, 'PM_OUT');
  assert.equal(pmInDone.completedPunches, 3);

  // 5. Completed workday
  const completed = dailyAttendanceState({ amIn: '08:02 AM', amOut: '12:01 PM', pmIn: '01:05 PM', pmOut: '05:03 PM', hours: 8.0 });
  assert.equal(completed.currentStage, 'COMPLETED');
  assert.equal(completed.nextPunch, null);
  assert.equal(completed.completedPunches, 4);
});

test('ojtHoursOverview tallies verified, approved, and pending hours without inflating totals', () => {
  const student = { id: 'stu-1', college: 'CITE' };
  const db = {
    collegeSettings: { CITE: { requiredHours: 324 } },
    logs: [
      { studentId: 'stu-1', status: 'Coordinator Approved', hours: 8.0 },
      { studentId: 'stu-1', status: 'Supervisor Verified', hours: 8.0 },
      { studentId: 'stu-1', status: 'Pending Supervisor Verification', hours: 4.0 },
      { studentId: 'stu-1', status: 'Rejected', hours: 8.0 }, // Not counted in approved
      { studentId: 'other-student', status: 'Coordinator Approved', hours: 10.0 } // Excluded
    ]
  };

  const overview = ojtHoursOverview(db, student);
  assert.equal(overview.required, 324);
  assert.equal(overview.approved, 16.0); // 8 coord + 8 supervisor
  assert.equal(overview.coordinatorApproved, 8.0);
  assert.equal(overview.supervisorVerified, 8.0);
  assert.equal(overview.pendingVerification, 4.0);
  assert.equal(overview.totalRecorded, 28.0); // 8+8+4+8
  assert.equal(overview.remaining, 308.0);
  assert.equal(overview.percent, 4.9);
});

test('filterDtrRecords filters by month, verification status, and multi-field query', () => {
  const records = [
    { date: '2026-10-15', title: 'API Integration', status: 'Supervisor Verified', hours: 8 },
    { date: '2026-10-16', title: 'Unit Testing', status: 'Pending Supervisor Verification', hours: 8 },
    { date: '2026-11-02', title: 'Database Migration', status: 'Coordinator Approved', hours: 8 }
  ];

  // Filter by period
  const octRecords = filterDtrRecords(records, { period: '2026-10' });
  assert.equal(octRecords.length, 2);

  // Filter by status
  const pendingRecords = filterDtrRecords(records, { status: 'PENDING' });
  assert.equal(pendingRecords.length, 1);
  assert.equal(pendingRecords[0].title, 'Unit Testing');

  // Search by keyword
  const searchResult = filterDtrRecords(records, { query: 'migration' });
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].date, '2026-11-02');
});
