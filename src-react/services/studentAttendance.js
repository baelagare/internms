import { requireStudent } from './localRepository.js';
import { approvedHours, studentLogs } from './training.js';

export const PUNCH_CONFIG = {
  AM_IN: { label: 'AM Time In', shortLabel: 'AM In', targetTime: '08:00 AM', session: 'morning', order: 1 },
  AM_OUT: { label: 'AM Time Out', shortLabel: 'AM Out', targetTime: '12:00 PM', session: 'morning', order: 2 },
  PM_IN: { label: 'PM Time In', shortLabel: 'PM In', targetTime: '01:00 PM', session: 'afternoon', order: 3 },
  PM_OUT: { label: 'PM Time Out', shortLabel: 'PM Out', targetTime: '05:00 PM', session: 'afternoon', order: 4 },
};

export const ADJUSTMENT_CATEGORIES = [
  'Off-site / Field Client Assignment',
  'Forgotten Time Out Punch',
  'Camera / Hardware Malfunction',
  'Network / Connectivity Interruption',
  'Host Organization Schedule Adjustment',
  'Other Legitimate OJT Exception'
];

/**
 * Format date object or string to Philippine English display format.
 */
export function formatDateDisplay(dateInput) {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T00:00:00`) : dateInput;
  if (Number.isNaN(date.getTime())) return String(dateInput);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format time to standard 12-hour Philippine Standard Time format (hh:mm AM/PM).
 */
export function formatTime12(date = new Date()) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h12)}:${pad(minutes)} ${ampm}`;
}

/**
 * Returns today's ISO date string (YYYY-MM-DD) based on local browser date.
 */
export function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses "08:00 AM", "12:00 PM", "05:05 PM" into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr || timeStr === '-') return null;
  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let [_, hours, minutes, ampm] = match;
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);
  if (ampm) {
    const meridiem = ampm.toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }
  return hours * 60 + minutes;
}

/**
 * Calculates elapsed hours between two punch times, capped at maximum session hours.
 */
export function calculateIntervalHours(inTime, outTime, maxHours = 4.0) {
  const inMins = parseTimeToMinutes(inTime);
  const outMins = parseTimeToMinutes(outTime);
  if (inMins === null || outMins === null || outMins <= inMins) return 0;
  const diff = (outMins - inMins) / 60;
  return Math.min(maxHours, Math.round(diff * 10) / 10);
}

/**
 * Computes daily hours from recorded punches.
 * In standard 4-punch institutional OJT:
 * Morning session: AM In to AM Out (capped at 4.0 hours)
 * Lunch break (12:00 PM – 01:00 PM): not counted
 * Afternoon session: PM In to PM Out (capped at 4.0 hours)
 * Total: up to 8.0 hours
 */
export function calculateDailyHours(amIn, amOut, pmIn, pmOut) {
  let morning = 0;
  if (amIn && amIn !== '-' && amOut && amOut !== '-') {
    const elapsed = calculateIntervalHours(amIn, amOut, 4.0);
    morning = elapsed > 0 ? elapsed : 4.0;
  }

  let afternoon = 0;
  if (pmIn && pmIn !== '-' && pmOut && pmOut !== '-') {
    const elapsed = calculateIntervalHours(pmIn, pmOut, 4.0);
    afternoon = elapsed > 0 ? elapsed : 4.0;
  }

  return Math.round((morning + afternoon) * 10) / 10;
}

/**
 * Comprehensive OJT hour metrics calculation for the student.
 */
export function ojtHoursOverview(db, student) {
  const logs = studentLogs(db, student);
  const required = Number(db.collegeSettings?.[student.college]?.requiredHours) || 324;
  const approved = approvedHours(db, student);

  const coordinatorApproved = logs
    .filter(log => log.status === 'Coordinator Approved' || log.status === 'Approved')
    .reduce((sum, log) => sum + Number(log.hours || 0), 0);

  const supervisorVerified = logs
    .filter(log => log.status === 'Supervisor Verified')
    .reduce((sum, log) => sum + Number(log.hours || 0), 0);

  const pendingVerification = logs
    .filter(log => log.status === 'Pending Supervisor Verification')
    .reduce((sum, log) => sum + Number(log.hours || 0), 0);

  const totalRecorded = logs.reduce((sum, log) => sum + Number(log.hours || 0), 0);
  const remaining = Math.max(0, required - approved);
  const percent = required > 0 ? Math.round((approved / required) * 1000) / 10 : 0;

  return {
    required,
    approved,
    coordinatorApproved,
    supervisorVerified,
    pendingVerification,
    totalRecorded,
    remaining,
    percent
  };
}

/**
 * Retrieves the student's attendance log for a given date.
 */
export function getDailyAttendanceLog(db, student, targetDate) {
  const date = targetDate || getTodayDateString();
  return (db.logs || []).find(item =>
    item.date === date &&
    (item.studentId === student.id || (!item.studentId && item.student === student.name)) &&
    item.kind === 'attendance'
  ) || null;
}

/**
 * Determines the student's current daily punch stage and next available action.
 */
export function dailyAttendanceState(todayLog) {
  if (!todayLog) {
    return {
      statusLabel: 'Ready to Clock In',
      statusTone: 'neutral',
      currentStage: 'NOT_STARTED',
      nextPunch: 'AM_IN',
      nextPunchLabel: 'Record AM Time In',
      summary: 'No punches recorded for today yet. Start camera to record your morning Time In.',
      completedPunches: 0,
      totalPunches: 4
    };
  }

  const hasAmIn = todayLog.amIn && todayLog.amIn !== '-';
  const hasAmOut = todayLog.amOut && todayLog.amOut !== '-';
  const hasPmIn = todayLog.pmIn && todayLog.pmIn !== '-';
  const hasPmOut = todayLog.pmOut && todayLog.pmOut !== '-';

  if (hasAmIn && !hasAmOut) {
    return {
      statusLabel: 'Morning Session in Progress',
      statusTone: 'blue',
      currentStage: 'AM_IN_RECORDED',
      nextPunch: 'AM_OUT',
      nextPunchLabel: 'Record AM Time Out',
      summary: `AM Time In recorded at ${todayLog.amIn}. Ready to clock out for lunch break.`,
      completedPunches: 1,
      totalPunches: 4
    };
  }

  if (hasAmIn && hasAmOut && !hasPmIn) {
    return {
      statusLabel: 'AM Session Completed',
      statusTone: 'blue',
      currentStage: 'AM_SESSION_DONE',
      nextPunch: 'PM_IN',
      nextPunchLabel: 'Record PM Time In',
      summary: `Morning session completed (${todayLog.amIn} – ${todayLog.amOut}). Ready to clock in for afternoon session.`,
      completedPunches: 2,
      totalPunches: 4
    };
  }

  if (hasPmIn && !hasPmOut) {
    return {
      statusLabel: 'Afternoon Session in Progress',
      statusTone: 'blue',
      currentStage: 'PM_IN_RECORDED',
      nextPunch: 'PM_OUT',
      nextPunchLabel: 'Record PM Time Out',
      summary: `PM Time In recorded at ${todayLog.pmIn}. Ready to clock out at the end of the work day.`,
      completedPunches: hasAmOut ? 3 : 1,
      totalPunches: 4
    };
  }

  if ((hasAmIn && hasAmOut && hasPmIn && hasPmOut) || hasPmOut) {
    return {
      statusLabel: 'Daily Attendance Completed',
      statusTone: 'success',
      currentStage: 'COMPLETED',
      nextPunch: null,
      nextPunchLabel: 'Daily Punches Completed',
      summary: `Daily attendance completed. Recorded ${todayLog.hours || 8} hours queued for supervisor verification.`,
      completedPunches: 4,
      totalPunches: 4
    };
  }

  return {
    statusLabel: 'Ready to Clock In',
    statusTone: 'neutral',
    currentStage: 'NOT_STARTED',
    nextPunch: 'PM_IN',
    nextPunchLabel: 'Record PM Time In',
    summary: 'Ready to record attendance punch.',
    completedPunches: 0,
    totalPunches: 4
  };
}

/**
 * Records a camera attendance punch into the student's DTR within a repository transaction.
 */
export function recordAttendancePunchTransaction(db, actor, { punchType, dateStr, timeStr, snapshot, workSummary, shiftType = 'FULL_DAY' }) {
  const student = requireStudent(db, actor);
  const today = dateStr || getTodayDateString();
  const nowTime = timeStr || formatTime12(new Date());

  if (!['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT'].includes(punchType)) {
    throw new Error('Invalid attendance punch type. Expected AM_IN, AM_OUT, PM_IN, or PM_OUT.');
  }

  db.logs ||= [];
  let log = db.logs.find(item =>
    item.date === today &&
    (item.studentId === student.id || (!item.studentId && item.student === student.name)) &&
    item.kind === 'attendance'
  );

  if (log) {
    if (punchType === 'AM_IN' && log.amIn && log.amIn !== '-') {
      throw new Error('AM Time In has already been recorded for today.');
    }
    if (punchType === 'AM_OUT') {
      if (!log.amIn || log.amIn === '-') throw new Error('Cannot record AM Time Out without prior AM Time In.');
      if (log.amOut && log.amOut !== '-') throw new Error('AM Time Out has already been recorded for today.');
    }
    if (punchType === 'PM_IN' && log.pmIn && log.pmIn !== '-') {
      throw new Error('PM Time In has already been recorded for today.');
    }
    if (punchType === 'PM_OUT') {
      if (!log.pmIn || log.pmIn === '-') throw new Error('Cannot record PM Time Out without prior PM Time In.');
      if (log.pmOut && log.pmOut !== '-') throw new Error('PM Time Out has already been recorded for today.');
    }

    if (punchType === 'AM_IN') log.amIn = nowTime;
    if (punchType === 'AM_OUT') log.amOut = nowTime;
    if (punchType === 'PM_IN') log.pmIn = nowTime;
    if (punchType === 'PM_OUT') log.pmOut = nowTime;

    log.punchType = punchType;
    if (snapshot) log.photo = snapshot;
    if (workSummary?.trim()) {
      log.title = workSummary.trim();
      log.description = workSummary.trim();
    }

    const computedHours = calculateDailyHours(log.amIn, log.amOut, log.pmIn, log.pmOut);
    log.hours = computedHours;

    log.auditTrail ||= [];
    log.auditTrail.push({
      event: punchType,
      time: nowTime,
      timestamp: new Date().toISOString(),
      source: 'live_camera',
      verifiedBySupervisor: false
    });
  } else {
    if (punchType === 'AM_OUT') {
      throw new Error('Cannot record AM Time Out without prior AM Time In.');
    }
    if (punchType === 'PM_OUT') {
      throw new Error('Cannot record PM Time Out without prior PM Time In.');
    }

    const isAm = punchType === 'AM_IN';
    const defaultTitle = workSummary?.trim() || `DTR Attendance — ${today}`;
    const defaultDescription = workSummary?.trim() || `Completed on-site attendance at ${student.company || 'Partner HTE'}.`;

    log = {
      id: crypto.randomUUID(),
      studentId: student.id,
      student: student.name,
      college: student.college,
      company: student.company || 'Partner HTE',
      date: today,
      weekNumber: 7,
      kind: 'attendance',
      punchType,
      checkInTime: nowTime,
      amIn: isAm ? nowTime : '-',
      amOut: '-',
      pmIn: !isAm ? nowTime : '-',
      pmOut: '-',
      period: shiftType === 'FULL_DAY' ? 'Full Day (AM & PM)' : (isAm ? 'Morning Session' : 'Afternoon Session'),
      title: defaultTitle,
      description: defaultDescription,
      hours: 0,
      status: 'Pending Supervisor Verification',
      supervisorVerifiedBy: null,
      coordinatorApprovedBy: null,
      remarks: '',
      photo: snapshot || null,
      auditTrail: [
        {
          event: punchType,
          time: nowTime,
          timestamp: new Date().toISOString(),
          source: 'live_camera',
          verifiedBySupervisor: false
        }
      ]
    };

    db.logs.unshift(log);
  }

  return log;
}

/**
 * Submits an attendance adjustment request to the supervisor queue.
 */
export function submitAdjustmentTransaction(db, actor, values) {
  const student = requireStudent(db, actor);
  const targetDate = String(values.targetDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(Date.parse(targetDate))) {
    throw new Error('Enter a valid attendance date in YYYY-MM-DD format.');
  }

  const today = getTodayDateString();
  if (targetDate > today) {
    throw new Error('Attendance adjustments cannot be requested for future dates.');
  }

  const requestedHours = Number(values.requestedHours);
  if (!Number.isFinite(requestedHours) || requestedHours < 1 || requestedHours > 12) {
    throw new Error('Requested hours must be between 1 and 12 hours.');
  }

  const reason = String(values.reason || '').trim();
  if (reason.length < 10) {
    throw new Error('Provide an explanation of at least 10 characters justifying the requested adjustment.');
  }

  db.dtrDisputes ||= [];
  const existingPending = db.dtrDisputes.find(item =>
    (item.studentId === student.id || (!item.studentId && item.studentName === student.name)) &&
    item.targetDate === targetDate &&
    item.status === 'Pending Supervisor Verification'
  );
  if (existingPending) {
    throw new Error(`An adjustment request for ${targetDate} is already pending supervisor verification.`);
  }

  const newDispute = {
    id: `DISP-${new Date().getFullYear()}-${String(db.dtrDisputes.length + 1).padStart(2, '0')}`,
    studentId: student.id,
    studentName: student.name,
    college: student.college,
    company: student.company || 'Partner HTE',
    targetDate,
    requestedAmIn: values.requestedAmIn || '08:00 AM',
    requestedAmOut: values.requestedAmOut || '12:00 PM',
    requestedPmIn: values.requestedPmIn || '01:00 PM',
    requestedPmOut: values.requestedPmOut || '05:00 PM',
    requestedHours,
    reasonCategory: values.reasonCategory || 'General Schedule Adjustment',
    reason,
    attachmentName: null,
    status: 'Pending Supervisor Verification',
    supervisorRemarks: '',
    coordinatorRemarks: '',
    submittedAt: new Date().toISOString()
  };

  db.dtrDisputes.unshift(newDispute);
  return newDispute;
}

/**
 * Extracts distinct Year-Month options from attendance records for period filtering.
 */
export function getAvailableReportingPeriods(logs) {
  const periods = new Set();
  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  periods.add(currentYm);

  (logs || []).forEach(log => {
    if (log.date && /^\d{4}-\d{2}/.test(log.date)) {
      periods.add(log.date.slice(0, 7));
    }
  });

  const sorted = Array.from(periods).sort().reverse();
  return sorted.map(ym => {
    const [year, month] = ym.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return {
      value: ym,
      label: ym === currentYm ? `${label} (Current Month)` : label
    };
  });
}

/**
 * Filters DTR logs by period, verification status, and search query.
 */
export function filterDtrRecords(records, { period = 'ALL', status = 'ALL', query = '' }) {
  return (records || []).filter(item => {
    if (period !== 'ALL' && item.date && !item.date.startsWith(period)) {
      return false;
    }

    if (status !== 'ALL') {
      if (status === 'APPROVED' && !['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(item.status)) {
        return false;
      }
      if (status === 'PENDING' && item.status !== 'Pending Supervisor Verification') {
        return false;
      }
      if (status === 'RETURNED' && !/returned|revision/i.test(item.status || '')) {
        return false;
      }
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      const match = [
        item.date,
        item.title,
        item.description,
        item.competencyTag,
        item.remarks,
        item.status,
        item.amIn,
        item.pmOut
      ].some(val => val && String(val).toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });
}

/**
 * Filters adjustment dispute records by status and search query.
 */
export function filterAdjustmentRecords(disputes, { status = 'ALL', query = '' }) {
  return (disputes || []).filter(item => {
    if (status !== 'ALL' && item.status !== status) {
      return false;
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      const match = [
        item.id,
        item.targetDate,
        item.reason,
        item.reasonCategory,
        item.supervisorRemarks,
        item.remarks,
        item.status,
        item.attachmentName
      ].some(val => val && String(val).toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
}