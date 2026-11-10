import { requireStudent, scopedStudents } from './localRepository.js';
import { recordLocalAudit } from './placement.js';

const required = (value, label) => { if (!String(value || '').trim()) throw new Error(`${label} is required.`); return String(value).trim(); };
const number = (value, min, max, label) => { const result = Number(value); if (!Number.isFinite(result) || result < min || result > max) throw new Error(`${label} must be between ${min} and ${max}.`); return result; };
const date = value => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Enter a valid date.'); return value; };
export const studentLogs = (db, student) => (db.logs || []).filter(log => log.studentId === student.id || (!log.studentId && log.student === student.name));
export const approvedHours = (db, student) => studentLogs(db, student).filter(log => ['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(log.status)).reduce((sum, log) => sum + Number(log.hours || 0), 0);

export function submitTraining(db, actor, kind, values) {
  const student = requireStudent(db, actor);
  const base = { id: crypto.randomUUID(), studentId: student.id, student: student.name, college: student.college, company: student.company, status: 'Pending Supervisor Verification', supervisorVerifiedBy: null, coordinatorApprovedBy: null, remarks: '' };
  if (kind === 'adjustment') {
    (db.dtrDisputes ||= []).unshift({ ...base, studentName: student.name, targetDate: date(values.targetDate), requestedHours: number(values.requestedHours, 1, 12, 'Requested hours'), reason: required(values.reason, 'Reason'), requestedAmIn: '08:00 AM', requestedAmOut: '12:00 PM', requestedPmIn: '01:00 PM', requestedPmOut: '05:00 PM', attachmentName: values.attachmentName || null, supervisorRemarks: '', submittedAt: new Date().toISOString() });
    return;
  }
  if (kind === 'attendance') {
    const mode = values.punchType;
    if (!['FULL_DAY', 'AM_SESSION', 'PM_SESSION'].includes(mode)) throw new Error('Choose a shift.');
    const summary = required(values.title, 'Work summary');
    (db.logs ||= []).unshift({ ...base, kind, date: date(values.date), weekNumber: 7, punchType: mode, amIn: mode !== 'PM_SESSION' ? '08:00 AM' : '-', amOut: mode !== 'PM_SESSION' ? '12:00 PM' : '-', pmIn: mode !== 'AM_SESSION' ? '01:00 PM' : '-', pmOut: mode !== 'AM_SESSION' ? '05:00 PM' : '-', period: mode === 'FULL_DAY' ? 'Full Day (AM & PM)' : mode, title: summary, description: summary, hours: mode === 'FULL_DAY' ? 8 : 4, attachmentName: values.attachmentName || null });
    return;
  }
  if (kind !== 'weekly_task') throw new Error('Unknown submission type.');
  (db.logs ||= []).unshift({ ...base, kind, date: new Date().toISOString().slice(0, 10), weekNumber: number(values.weekNumber, 1, 52, 'Week'), hours: number(values.hours, 1, 60, 'Hours'), title: required(values.title, 'Accomplishment title'), description: required(values.description, 'Summary'), competencyTag: required(values.competencyTag, 'Competency outcome') });
}

export function reviewTraining(db, actor, kind, id, studentId, approve, remarks = '') {
  if (!['supervisor', 'coordinator', 'admin'].includes(actor.role)) throw new Error('Review requires a supervisor or coordinator.');
  const student = scopedStudents(db, actor).find(item => item.id === studentId);
  if (!student) throw new Error('This student is outside your authorized scope.');
  if (!approve && remarks.trim().length < 5) throw new Error('Provide at least five characters of revision instructions.');
  const supervisor = actor.role === 'supervisor';
  if (kind === 'document') {
    if (supervisor) throw new Error('Only coordinators may verify checklist documents.');
    const document = student.preDeploymentDocs?.find(item => item.id === id);
    if (!document?.fileName) throw new Error('No submitted document exists.');
    document.status = approve ? 'Verified' : 'Returned for Revision';
    document.verifiedBy = approve ? actor.name : null;
    document.remarks = approve ? `Verified by ${actor.name}.` : remarks.trim();
    recordLocalAudit(db, actor, student, approve ? 'PRE_DEPLOYMENT_DOC_VERIFIED' : 'PRE_DEPLOYMENT_DOC_RETURNED', `${document.code}: ${document.status}`, { finalDispatchedText: document.remarks });
    return;
  }
  const collection = kind === 'adjustment' ? db.dtrDisputes : kind === 'log' ? db.logs : null;
  const record = collection?.find(item => String(item.id) === String(id) && (item.studentId === student.id || (!item.studentId && item.student === student.name)));
  if (!record) throw new Error('This submission no longer exists.');
  const expected = supervisor ? 'Pending Supervisor Verification' : 'Supervisor Verified';
  if (record.status !== expected) throw new Error(`This submission must be ${expected} before this action.`);
  record.status = approve ? supervisor ? 'Supervisor Verified' : 'Coordinator Approved' : 'Returned for Revision';
  record.remarks = remarks.trim() || (approve ? `Reviewed by ${actor.name}.` : 'Returned for revision.');
  record[supervisor ? 'supervisorVerifiedBy' : 'coordinatorApprovedBy'] = actor.name;
  if (kind === 'adjustment') {
    if (supervisor) record.supervisorRemarks = record.remarks;
    if (approve && !supervisor) (db.logs ||= []).unshift({ id: crypto.randomUUID(), adjustmentId: record.id, studentId: student.id, student: student.name, college: student.college, company: record.company, date: record.targetDate, weekNumber: 6, kind: 'attendance', amIn: record.requestedAmIn, amOut: record.requestedAmOut, pmIn: record.requestedPmIn, pmOut: record.requestedPmOut, hours: record.requestedHours, title: `Approved Attendance Adjustment (${record.id})`, description: record.reason, status: 'Coordinator Approved', supervisorVerifiedBy: record.supervisorVerifiedBy, coordinatorApprovedBy: actor.name });
  }
}