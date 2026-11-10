import { requireStudent } from './localRepository.js';
import { approvedHours, studentLogs } from './training.js';
import { formatTime12, getTodayDateString } from './studentAttendance.js';

export const COLLEGE_COMPETENCY_OPTIONS = {
  CITE: [
    'CS-PO1: Apply Knowledge of Computing, Science & Mathematics',
    'CS-PO2: Apply Mathematical & Algorithmic Foundations',
    'CS-PO3: Design, Implement & Evaluate Computing Systems',
    'CS-PO4: Conduct Applied Computing Research',
    'IT-PO1: Administer, Secure & Maintain Information Technology Infrastructure',
    'IT-PO2: Integrate & Deploy Enterprise Software Solutions'
  ],
  CBM: [
    'BM-PO1: Apply Business Management & Operational Planning Principles',
    'BM-PO2: Execute Financial, Accounting & Audit Control Procedures',
    'HM-PO1: Deliver Hospitality, Front Office & Guest Relations Standards',
    'HM-PO2: Manage Food, Beverage & Events Service Operations'
  ],
  CAS: [
    'ENV-PO1: Ecological Field Assessment & Spatial Analysis',
    'CAS-PO2: Laboratory Analysis, Scientific Documentation & Data Reporting',
    'CAS-PO3: Community Engagement & Public Service Communication'
  ],
  CET: [
    'CE-PO1: Structural Design, Drafting & Engineering Computation',
    'CE-PO2: Site Supervision, Surveying & Construction Project Management',
    'CE-PO3: Materials Engineering & Structural Quality Control'
  ],
  CTE: [
    'EDUC-PO1: Curriculum Planning & Instructional Material Development',
    'EDUC-PO2: Facilitating Learner-Centered Instruction & Assessment',
    'EDUC-PO3: Classroom Management & Student Mentorship'
  ]
};

export function getCompetencyOptionsForCollege(college = 'CITE') {
  return COLLEGE_COMPETENCY_OPTIONS[college] || [
    'Program Core Competency Outcome — Technical Deliverable',
    'Program Core Competency Outcome — Operational & Field Practice',
    'Program Core Competency Outcome — Research & Documentation'
  ];
}

/**
 * Computes DTR attendance hours and existing weekly task report status for a specific week.
 * Separates student-reported hours from supervisor-verified and coordinator-approved hours.
 */
export function getWeekTaskSummary(db, student, weekNumber) {
  const week = Number(weekNumber) || 7;
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
  const requiredQuota = Number(db?.collegeSettings?.[student?.college]?.requiredHours) || 324;

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

/**
 * Validates weekly task report form fields and live camera evidence before submission.
 */
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

/**
 * Records a student's weekly task report with live camera evidence into the repository.
 * Enforces:
 * - Authenticated student ownership
 * - No file upload metadata substitution
 * - Live camera snapshot requirement
 * - Protection against duplicate active submissions for the same week
 * - Revision resubmission support when a report was Returned for Revision
 * - Initial state strictly set to "Pending Supervisor Verification"
 */
export function submitWeeklyTaskReportTransaction(db, actor, payload = {}) {
  const student = requireStudent(db, actor);

  if (payload.attachmentName || payload.file) {
    throw new Error('File uploads are not permitted for weekly task logs. Capture live camera evidence instead.');
  }

  const errors = validateWeeklyTaskReport(payload);
  const firstError = Object.values(errors)[0];
  if (firstError) {
    throw new Error(firstError);
  }

  const weekNumber = Number(payload.weekNumber);
  const reportedHours = Math.round(Number(payload.hours) * 10) / 10;
  const competencyTag = String(payload.competencyTag).trim();
  const title = String(payload.title).trim();
  const description = String(payload.description).trim();
  const snapshot = String(payload.snapshot).trim();

  const now = new Date();
  const todayStr = getTodayDateString(now);
  const timeStr = formatTime12(now);
  const isoTimestamp = now.toISOString();

  db.logs ||= [];

  // Check for existing weekly_task report for the same student and weekNumber
  const studentWeekReports = db.logs.filter(
    item =>
      (item.studentId === student.id || (!item.studentId && item.student === student.name)) &&
      item.kind === 'weekly_task' &&
      Number(item.weekNumber) === weekNumber
  );

  const activeExisting = studentWeekReports.find(
    item => !/returned|revision|rejected/i.test(item.status || '')
  );

  if (activeExisting) {
    throw new Error(
      `A weekly task report for Week ${weekNumber} is already on record (${activeExisting.status}). Select another week or wait for supervisor review.`
    );
  }

  const weekSummary = getWeekTaskSummary(db, student, weekNumber);
  const returnedExisting = studentWeekReports.find(
    item => /returned|revision/i.test(item.status || '')
  );

  if (returnedExisting) {
    returnedExisting.date = todayStr;
    returnedExisting.title = title;
    returnedExisting.description = description;
    returnedExisting.hours = reportedHours;
    returnedExisting.reportedHours = reportedHours;
    returnedExisting.dtrReferenceHours = weekSummary.dtrRecordedHours;
    returnedExisting.competencyTag = competencyTag;
    returnedExisting.status = 'Pending Supervisor Verification';
    returnedExisting.supervisorVerifiedBy = null;
    returnedExisting.coordinatorApprovedBy = null;
    returnedExisting.remarks = '';
    returnedExisting.photo = snapshot;
    returnedExisting.evidenceSource = 'live_camera';
    returnedExisting.evidenceCapturedAt = payload.capturedAt || isoTimestamp;
    returnedExisting.submittedAt = isoTimestamp;
    returnedExisting.auditTrail ||= [];
    returnedExisting.auditTrail.push({
      event: 'WEEKLY_TASK_RESUBMITTED',
      time: timeStr,
      timestamp: isoTimestamp,
      source: 'live_camera',
      verifiedBySupervisor: false
    });
    return returnedExisting;
  }

  const record = {
    id: crypto.randomUUID(),
    studentId: student.id,
    student: student.name,
    college: student.college,
    company: student.company || 'Partner HTE',
    date: todayStr,
    weekNumber,
    kind: 'weekly_task',
    title,
    description,
    hours: reportedHours,
    reportedHours,
    dtrReferenceHours: weekSummary.dtrRecordedHours,
    competencyTag,
    status: 'Pending Supervisor Verification',
    supervisorVerifiedBy: null,
    coordinatorApprovedBy: null,
    remarks: '',
    photo: snapshot,
    evidenceSource: 'live_camera',
    evidenceCapturedAt: payload.capturedAt || isoTimestamp,
    submittedAt: isoTimestamp,
    auditTrail: [
      {
        event: 'WEEKLY_TASK_SUBMITTED',
        time: timeStr,
        timestamp: isoTimestamp,
        source: 'live_camera',
        verifiedBySupervisor: false
      }
    ]
  };

  db.logs.unshift(record);
  return record;
}

/**
 * Maps a task/training log status to a semantic StatusBadge tone.
 */
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

/**
 * Returns structured metadata for a log's record type (Weekly Task Report vs. Daily DTR Log).
 */
export function formatLogRecordType(log = {}) {
  const isWeekly = log?.kind === 'weekly_task';
  return {
    key: isWeekly ? 'weekly_task' : 'attendance',
    label: isWeekly ? 'Weekly Report' : 'Daily DTR Log',
    badgeClass: isWeekly ? 'is-weekly' : 'is-dtr'
  };
}

/**
 * Filters and sorts student task logs using targeted human-readable fields.
 * Explicitly excludes base64/SVG `photo` strings and internal IDs from search matching.
 */
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

/**
 * Computes summary metrics for a list of task logs.
 */
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

/**
 * Paginates filtered task logs cleanly and clamps page bounds.
 */
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

/**
 * Component 3: Computes structured verification chain steps, hour crediting attribution,
 * camera evidence metadata, and chronological audit events for a task/training log.
 */
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

/**
 * Component 4: Computes KPI metrics and summary breakdown for the Student Task Logs module overview.
 */
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
  const requiredQuota = Number(db?.collegeSettings?.[student?.college]?.requiredHours) || 324;
  const quotaPercent = Math.min(100, Math.round((approvedOjtHours / requiredQuota) * 100));

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

/**
 * Component 5: Builds the default narrative report sections from the student's actual placement and skills.
 */
export function getDefaultNarrativeTemplate(student = {}) {
  const skills = Array.isArray(student?.portfolioData?.skills)
    ? student.portfolioData.skills.slice(0, 4).join(', ')
    : '';
  const skillPhrase = skills || 'core technical and operational competencies';

  return {
    intro: `Completed On-the-Job Training at ${student?.company || 'Partner HTE'} as ${
      student?.assignedRole || 'Student Intern'
    }, applying ${student?.program || 'degree program'} competencies to real-world deliverables.`,
    reflection: `Throughout the internship period, I strengthened my proficiency in ${skillPhrase} while collaborating with industry mentors.`
  };
}

function narrativeStorageKey(student = {}) {
  return `internms_narrative_draft_${student?.id || student?.studentNumber || 'student'}`;
}

/**
 * Loads the student's narrative report draft from sessionStorage, or returns the default template.
 */
export function loadNarrativeDraft(student = {}, storage = globalThis.sessionStorage) {
  const defaults = getDefaultNarrativeTemplate(student);
  if (!storage || typeof storage.getItem !== 'function') {
    return { ...defaults, isSavedDraft: false, updatedAt: null };
  }

  try {
    const raw = storage.getItem(narrativeStorageKey(student));
    if (!raw) {
      return { ...defaults, isSavedDraft: false, updatedAt: null };
    }
    const parsed = JSON.parse(raw);
    return {
      intro: typeof parsed.intro === 'string' ? parsed.intro : defaults.intro,
      reflection: typeof parsed.reflection === 'string' ? parsed.reflection : defaults.reflection,
      isSavedDraft: true,
      updatedAt: parsed.updatedAt || null
    };
  } catch {
    return { ...defaults, isSavedDraft: false, updatedAt: null };
  }
}

/**
 * Persists the student's narrative report draft in sessionStorage.
 */
export function saveNarrativeDraft(
  student = {},
  draft = {},
  storage = globalThis.sessionStorage
) {
  const defaults = getDefaultNarrativeTemplate(student);
  const record = {
    intro: typeof draft.intro === 'string' ? draft.intro : defaults.intro,
    reflection: typeof draft.reflection === 'string' ? draft.reflection : defaults.reflection,
    updatedAt: new Date().toISOString()
  };

  if (storage && typeof storage.setItem === 'function') {
    try {
      storage.setItem(narrativeStorageKey(student), JSON.stringify(record));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }

  return {
    ...record,
    isSavedDraft: true
  };
}



