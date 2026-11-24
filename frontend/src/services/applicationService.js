import { apiRequest, getDatabase, getPersistedSessionId } from './apiClient.js';
export { getDatabase as readApplicationData } from './apiClient.js';

const unsupported = name => { throw new Error(`${name} is not supported by the current API. No changes were saved.`); };
async function mutate(path, method, body) {
  if (!getPersistedSessionId()) throw new Error('Sign in before saving changes.');
  await apiRequest(path, { method, body });
  try { return await getDatabase(); }
  catch (error) { throw new Error(`The change was saved, but the workspace could not refresh. Reload before retrying. ${error.message}`); }
}
async function studentRecord(id) {
  const db = await getDatabase();
  const student = db.users.find(row => String(row.id) === String(id) && row.role === 'student');
  if (!student?.studentProfileId) throw new Error('This account has no student profile provisioned yet. Contact your coordinator.');
  return student;
}

export const reviewAlert = (user, id, action, values) => mutate(`/alerts/${id}/review`, 'POST', { action, stage: values.stage, message: values.message, reason: values.reason });
export function savePartner(user, id, values) {
  const body = Object.fromEntries(Object.entries({
    name: values.name, college_code: values.college, location: values.location,
    role_title: values.roleTitle, description: values.description, required_skills: values.requiredSkills,
    max_slots: values.maxSlots === '' ? null : values.maxSlots,
    min_gpa: values.minGpa === '' ? null : values.minGpa, supervisor_name: values.supervisorName
  }).filter(([, value]) => value !== undefined));
  return mutate(id ? `/partners/${id}` : '/partners', id ? 'PATCH' : 'POST', body);
}
export const createStaff = (user, values) => mutate('/staff', 'POST', values);
export const saveSettings = (user, college, values) => mutate(`/colleges/${encodeURIComponent(college)}/settings`, 'PUT', values);
export const createDocumentRequirement = (user, college, values) => mutate(`/colleges/${encodeURIComponent(college)}/document-requirements`, 'POST', values);
export const updateDocumentRequirement = (user, id, values) => mutate(`/college-document-requirements/${id}`, 'PATCH', values);
export const deactivateDocumentRequirement = (user, id) => mutate(`/college-document-requirements/${id}`, 'DELETE');
export const createPolicy = (user, values) => mutate('/policy-corpus', 'POST', values);
export async function saveEvaluation(user, id, values) {
  const student = await studentRecord(id);
  const db = await getDatabase();
  if (db.evaluations.some(row => String(row.studentId) === String(id))) unsupported('Updating a recorded evaluation');
  if (!['Midterm', 'Final'].includes(values.evaluationPeriod)) throw new Error('Choose Midterm or Final for the evaluation period.');
  return mutate('/evaluations', 'POST', { student_id: student.studentProfileId, period: values.evaluationPeriod, scores: values.scores,
    feedback: [values.strengths && `Strengths: ${values.strengths}`, values.areasForImprovement && `Areas for improvement: ${values.areasForImprovement}`].filter(Boolean).join('\n') });
}
export async function grantClearance(user, id) {
  const student = await studentRecord(id);
  return mutate(`/students/${student.studentProfileId}/clearance`, 'POST');
}
export async function submitOnboarding(user, values) {
  return mutate('/students/me/onboarding', 'POST', {
    student_number: values.studentNumber,
    college_code: values.college,
    program: values.program,
    phone: values.phone || null
  });
}
export async function approveEnrollment(user, id) {
  const student = await studentRecord(id);
  return mutate(`/students/${student.studentProfileId}/enrollment/approve`, 'POST');
}
export async function rejectEnrollment(user, id, reason) {
  const student = await studentRecord(id);
  return mutate(`/students/${student.studentProfileId}/enrollment/reject`, 'POST', { reason });
}
export async function updateEnrollment(user, id, values) {
  const student = await studentRecord(id);
  return mutate(`/students/${student.studentProfileId}/enrollment`, 'PATCH', {
    college_code: values.college,
    program: values.program,
    student_number: values.studentNumber,
    enrollment_status: values.enrollmentStatus
  });
}

export async function savePlacement(user, id, companyId, reason, role) {
  const student = await studentRecord(id);
  const field = user.role === 'student' ? 'preferred_role' : 'assigned_role';
  const body = { company_id: companyId, reason };
  if (role !== undefined) body[field] = role || null;
  return mutate(`/students/${student.studentProfileId}/placement`, 'POST', body);
}
export async function returnPlacementPreference(user, id, reason) {
  const student = await studentRecord(id);
  return mutate(`/students/${student.studentProfileId}/placement/return`, 'POST', { reason });
}
export function saveProfile(user, values) {
  return mutate('/students/me', 'PATCH', { phone: values.phone, bio: values.bio, gpa: values.gpa });
}
export function editPortfolio(user, type, action, value) {
  const item = action === 'remove' ? user.portfolioData?.[type]?.[value] : value;
  return mutate('/students/me/portfolio', action === 'remove' ? 'DELETE' : 'POST', { type, item });
}
export const restorePortfolioItem = (user, type, value) => type === 'resume' ? unsupported('Restoring a résumé') : editPortfolio(user, type, 'add', value);
export const removeResume = () => unsupported('Deleting a résumé');
export const saveApplicationData = () => unsupported('Bulk workspace writes');
export const createTrainingSubmission = () => unsupported('Generic training submissions');
export const postMessage = (user, id, body) => mutate('/messages', 'POST', { recipient_id: id, body });

export async function saveStudentFile(user, id, file) {
  if (!file) throw new Error('Choose a file first.');
  const doc = user.preDeploymentDocs?.find(row => String(row.id) === String(id) || String(row.docCode || row.code) === String(id) || `requirement:${row.docCode || row.code}` === String(id));
  if (id !== 'resume' && !doc) throw new Error('The document requirement is no longer available. Reload the workspace.');
  if (doc?.fileName) unsupported('Replacing a submitted document');
  const body = new FormData();
  body.set('docCode', id === 'resume' ? 'RESUME' : doc.docCode || doc.code);
  body.set('title', id === 'resume' ? 'Résumé' : doc.title);
  if (doc?.issuer) body.set('issuer', doc.issuer);
  body.set('file', file);
  return mutate('/students/me/documents', 'POST', body);
}
export async function recordAttendancePunch(user, values) {
  // Date/time come from the API clock, not the editable client clock.
  const body = new FormData();
  body.set('type', values.punchType.toLowerCase());
  if (values.snapshot) {
    const match = values.snapshot.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/);
    if (!match) throw new Error('Capture a valid punch verification photo.');
    const bytes = Uint8Array.from(atob(match[2]), char => char.charCodeAt(0));
    body.set('photo', new Blob([bytes], { type: match[1] }), match[1] === 'image/png' ? 'punch.png' : 'punch.jpg');
  }
  return mutate('/attendance/punches', 'POST', body);
}
export const submitAttendanceAdjustment = (user, values) => mutate('/attendance/adjustments', 'POST', {
  date: values.targetDate, requested_hours: Number(values.requestedHours),
  reason: values.reasonCategory, notes: values.reason,
  am_in: values.requestedAmIn || null, am_out: values.requestedAmOut || null,
  pm_in: values.requestedPmIn || null, pm_out: values.requestedPmOut || null
});
export async function submitWeeklyTaskReport(user, values) {
  if (!values.periodStart || !values.periodEnd) throw new Error('Enter the report start and end dates.');
  const body = new FormData();
  body.set('week', values.weekNumber);
  body.set('period_start', values.periodStart);
  body.set('period_end', values.periodEnd);
  body.set('hours', values.hours);
  body.set('summary', `${values.title}\n${values.competencyTag}\n${values.description}`);
  if (values.snapshot) {
    const match = values.snapshot.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/);
    if (!match) throw new Error('Capture a valid task evidence image.');
    const bytes = Uint8Array.from(atob(match[2]), char => char.charCodeAt(0));
    body.set('evidence', new Blob([bytes], { type: match[1] }), match[1] === 'image/png' ? 'evidence.png' : 'evidence.jpg');
  }
  return mutate('/task-reports', 'POST', body);
}
export async function reviewSubmission(user, category, id, studentId, approve, remarks) {
  if (category === 'document') return mutate(`/documents/${id}/review`, 'PATCH', { status: approve ? 'Verified' : 'Returned for Revision', remarks });
  if (category === 'adjustment') {
    // Existing API has a single-stage adjustment review, not the UI's two-stage pipeline.
    if (user.role === 'supervisor') unsupported('Supervisor-first adjustment review');
    return mutate(`/attendance/adjustments/${id}/review`, 'POST', { status: approve ? 'Approved' : 'Rejected', notes: remarks });
  }
  const db = await getDatabase();
  const log = db.logs.find(row => String(row.id) === String(id));
  if (!log) unsupported('Reviewing this submission');
  const host = user.role === 'supervisor';
  if (log.kind === 'attendance') {
    if (host) {
      return mutate(`/attendance-logs/${log.apiId}/verify`, 'POST', {
        status: approve ? 'Supervisor Verified' : 'Returned for Revision',
        supervisor_notes: remarks || null,
      });
    }
    return mutate(`/attendance-logs/${log.apiId}/review`, 'POST', {
      status: approve ? 'Coordinator Approved' : 'Returned for Revision',
      coordinator_notes: remarks || null,
    });
  }
  if (log.kind !== 'weekly_task') unsupported('Reviewing this submission');
  return mutate(`/task-reports/${log.apiId}/${host ? 'verify' : 'review'}`, 'POST', {
    status: approve ? (host ? 'Supervisor Verified' : 'Coordinator Approved') : 'Returned for Revision',
    [host ? 'supervisor_notes' : 'coordinator_notes']: remarks
  });
}

