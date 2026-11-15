
import { approvedHours, studentLogs } from './training.js';

export const PUNCH_CONFIG = {
  AM_IN: { label: 'AM Time In', shortLabel: 'AM In', targetTime: '—', session: 'morning', order: 1 },
  AM_OUT: { label: 'AM Time Out', shortLabel: 'AM Out', targetTime: '—', session: 'morning', order: 2 },
  PM_IN: { label: 'PM Time In', shortLabel: 'PM In', targetTime: '—', session: 'afternoon', order: 3 },
  PM_OUT: { label: 'PM Time Out', shortLabel: 'PM Out', targetTime: '—', session: 'afternoon', order: 4 },
};

export const ADJUSTMENT_CATEGORIES = [
  'Off-site / Field Client Assignment',
  'Forgotten Time Out Punch',
  'Camera / Hardware Malfunction',
  'Network / Connectivity Interruption',
  'Host Organization Schedule Adjustment',
  'Other Legitimate OJT Exception'
];


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


export function formatTime12(date = new Date()) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h12)}:${pad(minutes)} ${ampm}`;
}


export function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


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


export function parseTimeIntervalMinutes(inTime, outTime) {
  const inMins = parseTimeToMinutes(inTime);
  const outMins = parseTimeToMinutes(outTime);
  if (inMins === null || outMins === null || outMins <= inMins) return null;
  return outMins - inMins;
}


export function calculateDailyHours(amIn, amOut, pmIn, pmOut) {
  let morning = 0;
  if (amIn && amIn !== '-' && amOut && amOut !== '-') {
    const diff = parseTimeIntervalMinutes(amIn, amOut);
    if (diff !== null) morning = Math.min(4.0, Math.round((diff / 60) * 10) / 10);
  }

  let afternoon = 0;
  if (pmIn && pmIn !== '-' && pmOut && pmOut !== '-') {
    const diff = parseTimeIntervalMinutes(pmIn, pmOut);
    if (diff !== null) afternoon = Math.min(4.0, Math.round((diff / 60) * 10) / 10);
  }

  return Math.round((morning + afternoon) * 10) / 10;
}


export function ojtHoursOverview(db, student) {
  const logs = studentLogs(db, student);
  const required = Number(db.collegeSettings?.[student.college]?.requiredHours) || null;
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
  const remaining = required == null ? null : Math.max(0, required - approved);
  const percent = required > 0 ? Math.round((approved / required) * 1000) / 10 : null;

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


export function getDailyAttendanceLog(db, student, targetDate) {
  const date = targetDate || getTodayDateString();
  return (db.logs || []).find(item =>
    item.date === date &&
    (item.studentId === student.id || (!item.studentId && item.student === student.name)) &&
    item.kind === 'attendance'
  ) || null;
}


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
    const recordedHours = todayLog.hours !== null && todayLog.hours !== undefined && todayLog.hours !== '' && Number.isFinite(Number(todayLog.hours)) ? Number(todayLog.hours) : null;
    return {
      statusLabel: 'Daily Attendance Completed',
      statusTone: 'success',
      currentStage: 'COMPLETED',
      nextPunch: null,
      nextPunchLabel: 'Daily Punches Completed',
      summary: recordedHours != null
        ? `Daily attendance completed. Recorded ${recordedHours} hours queued for supervisor verification.`
        : 'Daily attendance completed. Logged hours are queued for supervisor verification.',
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