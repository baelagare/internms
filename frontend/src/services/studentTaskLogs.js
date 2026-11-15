
import { approvedHours, studentLogs } from './training.js';


export const COLLEGE_COMPETENCY_OPTIONS = {};

export function getCompetencyOptionsForCollege() { return []; }


export function getWeekTaskSummary(db, student, weekNumber) {
  const week = Number(weekNumber) || null;
  const logs = studentLogs(db, student);
  const weekLogs = logs.filter(item => Number(item.weekNumber) === week);

  const attendanceLogs = weekLogs.filter(item => item.kind === 'attendance');
  const weeklyTaskLogs = weekLogs.filter(item => item.kind === 'weekly_task');

  const dtrRecordedHours = attendanceLogs.reduce((sum, item) => sum + Number(item.hours || 0), 0);
  const dtrVerifiedHours = attendanceLogs
    .filter(item => ['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(item.status))
    .reduce((sum, item) => sum + Number(item.hours || 0), 0);

  const existingActiveReport = weeklyTaskLogs.find(
    item => !/returned|revision|rejected/i.test(item.status || '')
  ) || null;

  const returnedReport = weeklyTaskLogs.find(
    item => /returned|revision/i.test(item.status || '')
  ) || null;

  const totalApprovedOjtHours = approvedHours(db, student);
  const requiredQuota = Number(db?.collegeSettings?.[student?.college]?.requiredHours) || null;

  return {
    weekNumber: week,
    dtrDaysCount: attendanceLogs.length,
    dtrRecordedHours,
    dtrVerifiedHours,
    existingActiveReport,
    returnedReport,
    totalApprovedOjtHours,
    requiredQuota
  };
}


export function validateWeeklyTaskReport(values = {}) {
  const errors = {};

  const weekNumber = Number(values.weekNumber);
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 52) {
    errors.weekNumber = 'Select a valid internship week between 1 and 52.';
  }

  const hours = Number(values.hours);
  if (!Number.isFinite(hours) || hours < 1 || hours > 60) {
    errors.hours = 'Reported weekly task hours must be between 1 and 60 hours.';
  }

  const competencyTag = String(values.competencyTag || '').trim();
  if (!competencyTag || competencyTag.length < 4) {
    errors.competencyTag = 'Select or enter the mapped program competency outcome.';
  }

  const title = String(values.title || '').trim();
  if (!title) {
    errors.title = 'Enter a concise accomplishment title for this weekly report.';
  } else if (title.length < 5) {
    errors.title = 'Accomplishment title must be at least 5 characters.';
  }

  const description = String(values.description || '').trim();
  if (!description) {
    errors.description = 'Provide a detailed summary of your weekly tasks and deliverables.';
  } else if (description.length < 15) {
    errors.description = 'Summary of work must be at least 15 characters.';
  }

  const snapshot = String(values.snapshot || '').trim();
  if (!snapshot) {
    errors.snapshot = 'Capture live camera task evidence before submitting your weekly report.';
  } else if (!snapshot.startsWith('data:image/')) {
    errors.snapshot = 'Task evidence must be a valid live camera image capture.';
  }

  return errors;
}





export function taskStatusTone(status = '') {
  const normalized = String(status).trim();
  if (normalized === 'Coordinator Approved' || normalized === 'Approved') {
    return 'success';
  }
  if (normalized === 'Supervisor Verified') {
    return 'blue';
  }
  if (/returned|revision|rejected|disputed/i.test(normalized)) {
    return 'danger';
  }
  if (/pending/i.test(normalized)) {
    return 'warning';
  }
  return 'neutral';
}


export function formatLogRecordType(log = {}) {
  const isWeekly = log?.kind === 'weekly_task';
  return {
    key: isWeekly ? 'weekly_task' : 'attendance',
    label: isWeekly ? 'Weekly Report' : 'Daily DTR Log',
    badgeClass: isWeekly ? 'is-weekly' : 'is-dtr'
  };
}


export function filterTaskLogs(logs = [], filters = {}) {
  const {
    query = '',
    recordType = 'all',
    status = 'all',
    week = 'all'
  } = filters;

  const trimmedQuery = String(query || '').trim().toLowerCase();

  return (logs || [])
    .filter(log => {
      if (recordType !== 'all') {
        const logKind = log.kind === 'weekly_task' ? 'weekly_task' : 'attendance';
        if (logKind !== recordType) return false;
      }

      if (status !== 'all') {
        if (String(log.status || '') !== status) return false;
      }

      if (week !== 'all' && week !== '') {
        if (Number(log.weekNumber) !== Number(week)) return false;
      }

      if (trimmedQuery) {
        const searchableFields = [
          log.date,
          log.weekNumber ? `week ${log.weekNumber}` : '',
          log.title,
          log.description,
          log.competencyTag,
          log.status,
          log.remarks,
          log.supervisorVerifiedBy,
          log.coordinatorApprovedBy,
          log.hours != null ? `${log.hours} hrs` : ''
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchableFields.includes(trimmedQuery)) {
          return false;
        }
      }

      return true;
    })
    .slice()
    .sort((a, b) => {
      const dateCmp = String(b.date || '').localeCompare(String(a.date || ''));
      if (dateCmp !== 0) return dateCmp;
      return Number(b.weekNumber || 0) - Number(a.weekNumber || 0);
    });
}


export function summarizeTaskLogs(logs = []) {
  let weeklyReportCount = 0;
  let attendanceLogCount = 0;
  let reportedHoursTotal = 0;
  let verifiedOrApprovedHoursTotal = 0;
  let pendingHoursTotal = 0;

  for (const log of logs || []) {
    const hrs = Number(log.hours || 0);
    reportedHoursTotal += hrs;

    if (log.kind === 'weekly_task') {
      weeklyReportCount += 1;
    } else {
      attendanceLogCount += 1;
    }

    if (['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(log.status)) {
      verifiedOrApprovedHoursTotal += hrs;
    } else if (/pending/i.test(log.status || '')) {
      pendingHoursTotal += hrs;
    }
  }

  return {
    totalCount: (logs || []).length,
    weeklyReportCount,
    attendanceLogCount,
    reportedHoursTotal: Math.round(reportedHoursTotal * 10) / 10,
    verifiedOrApprovedHoursTotal: Math.round(verifiedOrApprovedHoursTotal * 10) / 10,
    pendingHoursTotal: Math.round(pendingHoursTotal * 10) / 10
  };
}


export function paginateTaskLogs(logs = [], page = 1, pageSize = 8) {
  const safeSize = Math.max(1, Number(pageSize) || 8);
  const totalItems = (logs || []).length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const startIndex = (currentPage - 1) * safeSize;
  const items = (logs || []).slice(startIndex, startIndex + safeSize);

  return {
    items,
    currentPage,
    totalPages,
    totalItems,
    pageSize: safeSize,
    startIndex: totalItems === 0 ? 0 : startIndex + 1,
    endIndex: Math.min(startIndex + safeSize, totalItems)
  };
}


export function getVerificationChainDetails(log = {}) {
  const status = String(log.status || 'Pending Supervisor Verification').trim();
  const tone = taskStatusTone(status);
  const isWeeklyTask = log.kind === 'weekly_task';
  const isCoordinatorApproved = status === 'Coordinator Approved' || status === 'Approved';
  const isSupervisorVerified =
    isCoordinatorApproved || status === 'Supervisor Verified' || Boolean(log.supervisorVerifiedBy);
  const isReturned = /returned|revision|rejected/i.test(status);
  const isCredited = ['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(status);

  const reportedHours = Number(log.reportedHours ?? log.hours ?? 0);
  const creditedHours = isCredited ? Number(log.hours || 0) : 0;
  const pendingHours = !isCredited && !isReturned ? Number(log.hours || 0) : 0;
  const dtrReferenceHours =
    log.dtrReferenceHours != null && Number.isFinite(Number(log.dtrReferenceHours))
      ? Number(log.dtrReferenceHours)
      : null;

  let creditStatusLabel = 'Pending Supervisor Verification (0 hrs credited)';
  if (isCoordinatorApproved) {
    creditStatusLabel = `Officially Credited (${creditedHours.toFixed(1)} hrs approved by Coordinator)`;
  } else if (status === 'Supervisor Verified') {
    creditStatusLabel = `Verified & Credited (${creditedHours.toFixed(1)} hrs · Awaiting Coordinator Sign-Off)`;
  } else if (isReturned) {
    creditStatusLabel = 'Not Credited — Returned for Student Revision';
  }

  const hasCameraEvidence = Boolean(log.photo);
  const evidenceSourceLabel =
    log.evidenceSource === 'live_camera'
      ? 'Live WebRTC Camera Snapshot'
      : hasCameraEvidence
      ? 'Timestamped Camera Evidence'
      : 'No Camera Snapshot Attached';

  const returnedByCoordinator = isReturned && Boolean(log.coordinatorApprovedBy);
  const returnedBySupervisor = isReturned && !returnedByCoordinator;

  const supervisorState = returnedBySupervisor
    ? 'returned'
    : isSupervisorVerified || returnedByCoordinator
    ? 'completed'
    : 'active';

  const coordinatorState = isCoordinatorApproved
    ? 'completed'
    : returnedByCoordinator
    ? 'returned'
    : status === 'Supervisor Verified'
    ? 'active'
    : 'waiting';

  const steps = [
    {
      key: 'student_submission',
      stepNumber: 1,
      title: 'Student Submission & Live Evidence',
      state: 'completed',
      actor: log.student || 'Student Intern',
      badge: hasCameraEvidence ? 'Evidence Attached' : 'Submitted',
      detail: `${log.date || 'Recorded'} · ${reportedHours.toFixed(1)} hrs reported (${evidenceSourceLabel})`
    },
    {
      key: 'supervisor_verification',
      stepNumber: 2,
      title: 'HTE Supervisor Verification',
      state: supervisorState,
      actor:
        log.supervisorVerifiedBy ||
        (supervisorState === 'returned'
          ? 'Returned by HTE Supervisor'
          : 'Pending Host Supervisor Review'),
      badge:
        supervisorState === 'completed'
          ? 'Verified'
          : supervisorState === 'returned'
          ? 'Returned'
          : 'In Queue',
      detail:
        supervisorState === 'completed'
          ? 'On-site task deliverable and hours verified by partner supervisor.'
          : supervisorState === 'returned'
          ? 'Supervisor requested revisions before verifying task hours.'
          : 'Awaiting Host Training Establishment (HTE) supervisor verification.'
    },
    {
      key: 'coordinator_approval',
      stepNumber: 3,
      title: 'College OJT Coordinator Approval',
      state: coordinatorState,
      actor:
        log.coordinatorApprovedBy ||
        (coordinatorState === 'returned'
          ? 'Returned by OJT Coordinator'
          : coordinatorState === 'active'
          ? 'Ready for Coordinator Sign-Off'
          : 'Requires Supervisor Verification First'),
      badge:
        coordinatorState === 'completed'
          ? 'Approved'
          : coordinatorState === 'returned'
          ? 'Returned'
          : coordinatorState === 'active'
          ? 'Ready'
          : 'Waiting',
      detail:
        coordinatorState === 'completed'
          ? 'Final institutional approval recorded by College OJT Coordinator.'
          : coordinatorState === 'returned'
          ? 'Coordinator returned the submission with revision instructions.'
          : coordinatorState === 'active'
          ? 'Supervisor verification complete; queued for final coordinator sign-off.'
          : 'Queued behind HTE supervisor verification.'
    }
  ];

  const rawTrail = Array.isArray(log.auditTrail) ? log.auditTrail : [];
  const auditEvents = rawTrail.map((entry, index) => ({
    id: `${log.id || 'log'}-audit-${index}`,
    event: String(entry.event || 'RECORD_EVENT').replace(/_/g, ' '),
    time: entry.time || entry.timestamp || log.date || 'Recorded',
    source: entry.source === 'live_camera' ? 'Live Camera' : entry.source || 'System',
    verified: Boolean(entry.verifiedBySupervisor)
  }));

  if (log.supervisorVerifiedBy && !returnedBySupervisor) {
    auditEvents.push({
      id: `${log.id || 'log'}-sup-verified`,
      event: 'SUPERVISOR VERIFIED',
      time: log.date || 'Verified',
      source: log.supervisorVerifiedBy,
      verified: true
    });
  }

  if (log.coordinatorApprovedBy && isCoordinatorApproved) {
    auditEvents.push({
      id: `${log.id || 'log'}-coord-approved`,
      event: 'COORDINATOR APPROVED',
      time: log.date || 'Approved',
      source: log.coordinatorApprovedBy,
      verified: true
    });
  }

  if (isReturned) {
    auditEvents.push({
      id: `${log.id || 'log'}-returned`,
      event: 'RETURNED FOR REVISION',
      time: log.date || 'Review Action',
      source: log.coordinatorApprovedBy || log.supervisorVerifiedBy || 'Reviewer',
      verified: false
    });
  }

  return {
    status,
    tone,
    isWeeklyTask,
    isCoordinatorApproved,
    isSupervisorVerified,
    isReturned,
    isCredited,
    reportedHours,
    creditedHours,
    pendingHours,
    dtrReferenceHours,
    creditStatusLabel,
    hasCameraEvidence,
    evidenceSourceLabel,
    remarks: String(log.remarks || '').trim(),
    steps,
    auditEvents
  };
}


export function getTaskLogsModuleOverview(db = {}, student = {}) {
  const logs = studentLogs(db, student);
  const weeklyReports = logs.filter(item => item.kind === 'weekly_task');
  const weeklyReportsVerified = weeklyReports.filter(item =>
    ['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(item.status)
  );

  const pendingLogs = logs.filter(item => /pending/i.test(item.status || ''));
  const pendingReviewHours = pendingLogs.reduce((sum, item) => sum + Number(item.hours || 0), 0);
  const returnedLogs = logs.filter(item => /returned|revision|rejected/i.test(item.status || ''));

  const distinctCompetencies = new Set(
    logs.map(item => String(item.competencyTag || '').trim()).filter(Boolean)
  );
  const distinctWeeks = new Set(
    logs.map(item => Number(item.weekNumber)).filter(Boolean)
  );

  const approvedOjtHours = approvedHours(db, student);
  const requiredQuota = Number(db?.collegeSettings?.[student?.college]?.requiredHours) || null;
  const quotaPercent = requiredQuota ? Math.min(100, Math.round((approvedOjtHours / requiredQuota) * 100)) : null;

  return {
    approvedOjtHours: Math.round(approvedOjtHours * 10) / 10,
    requiredQuota,
    quotaPercent,
    totalLogsCount: logs.length,
    weeklyReportsSubmitted: weeklyReports.length,
    weeklyReportsVerified: weeklyReportsVerified.length,
    pendingReviewCount: pendingLogs.length,
    pendingReviewHours: Math.round(pendingReviewHours * 10) / 10,
    returnedRevisionCount: returnedLogs.length,
    distinctCompetenciesCount: distinctCompetencies.size,
    distinctWeeksLogged: distinctWeeks.size,
    company: student?.company || 'Not Assigned',
    assignedRole: student?.assignedRole || 'Student Intern'
  };
}


export function getDefaultNarrativeTemplate() { return { intro: '', reflection: '' }; }




export function loadNarrativeDraft() { return { ...getDefaultNarrativeTemplate(), isSavedDraft: false, updatedAt: null }; }


export function saveNarrativeDraft() { throw new Error('Narrative saving is unavailable until the backend is connected.'); }



