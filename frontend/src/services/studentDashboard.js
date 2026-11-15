import { approvedHours } from './training.js';

// Existing checklist callers retain their verification counts; dashboard presentation is separate.
export const belongsToStudent = (item, user, nameKey = 'student') => Boolean(item && user && (
  (user.id != null && user.id !== '' && item.studentId === user.id) ||
  (item.studentId == null && typeof user.name === 'string' && user.name.trim() && item[nameKey] === user.name)
));

export function dashboardSummary(user, db) {
  const docs = Array.isArray(user.preDeploymentDocs) ? user.preDeploymentDocs : [];
  // The checklist is provisioned on registration; absent requirements are not zero requirements.
  const required = docs.length || null;
  const verified = docs.filter(item => item.status === 'Verified').length;
  const hours = Array.isArray(db.logs) ? approvedHours(db, user) : null;
  const configuredQuota = Number(db.collegeSettings?.[user.college]?.requiredHours);
  const quota = Number.isFinite(configuredQuota) && configuredQuota > 0 ? configuredQuota : null;
  const percent = hours != null && quota ? Math.round(hours / quota * 1000) / 10 : null;
  const evaluation = (db.evaluations || []).find(item => belongsToStudent(item, user, 'studentName'));
  const alerts = (db.alerts || []).filter(item => belongsToStudent(item, user) && !/dismissed/i.test(item.hitlStatus || item.status || ''));
  return { verified, required, hours, quota, percent, evaluation, alerts };
}

const recordedNumber = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value));

// Read-only dashboard model. Missing collections are not evidence of zero activity.
export function studentDashboardModel(user, db) {
  if (!user || user.role !== 'student' || user.id == null || user.id === '') return { available: false };
  if (!db || typeof db !== 'object') return { available: false };
  const documents = Array.isArray(user.preDeploymentDocs) ? user.preDeploymentDocs.filter(Boolean) : null;
  const scopedLogs = Array.isArray(db.logs) ? db.logs.filter(item => belongsToStudent(item, user)) : null;
  const creditedLogs = scopedLogs?.filter(item => ['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(item.status));
  const hoursValid = creditedLogs?.every(item => recordedNumber(item.hours) && Number(item.hours) >= 0);
  const hours = hoursValid ? creditedLogs.reduce((sum, item) => sum + Number(item.hours), 0) : null;
  const rawQuota = db.collegeSettings?.[user.college]?.requiredHours;
  const quota = recordedNumber(rawQuota) && Number(rawQuota) > 0 ? Number(rawQuota) : null;
  const required = documents?.length || null;
  const verified = documents ? documents.filter(item => item.status === 'Verified').length : null;
  const revisions = documents?.filter(item => /returned|revision|rejected|resubmission/i.test(item.status || '')) || [];
  const missing = documents?.filter(item => item.status === 'Not Uploaded') || [];
  const company = typeof user.company === 'string' && !/^unassigned/i.test(user.company.trim()) ? user.company.trim() : '';
  const evaluations = Array.isArray(db.evaluations) ? db.evaluations.filter(item => belongsToStudent(item, user, 'studentName')) : null;
  const evaluation = evaluations?.[0] || null;
  const advisories = Array.isArray(db.alerts) ? db.alerts.filter(item => belongsToStudent(item, user) &&
    !/dismissed/i.test(item.hitlStatus || item.status || '') &&
    /^dispatched$/i.test(String(item.hitlStatus || item.status || '').trim()) &&
    typeof item.finalDispatchedText === 'string' && item.finalDispatchedText.trim()) : null;
  const clearanceStatus = user.clearanceStatus || evaluation?.coordinatorClearanceStatus || null;
  let action = null;
  if (revisions.length) action = { title: 'Review returned documents', description: 'Your checklist includes documents that need changes.', route: 'checklist', label: 'Review checklist' };
  else if (missing.length) action = { title: 'Submit your documents', description: 'Some assigned requirements have not been uploaded.', route: 'checklist', label: 'Open checklist' };
  else if (user.placementStatus === 'Unplaced' && required && verified === required) action = { title: 'Review placement options', description: 'Your assigned checklist is verified. Review your placement details.', route: 'placement', label: 'Open placement' };
  else if (user.placementStatus === 'Approved & Deployed' && clearanceStatus !== 'Cleared & Certified') action = { title: 'Record your attendance', description: 'Your deployment is approved. Open attendance to record your workday.', route: 'attendance', label: 'Open attendance' };
  return {
    available: true, required, verified, hours, quota, evaluation, action, advisories,
    evaluationsAvailable: evaluations !== null,
    placementStatus: user.placementStatus || null, company,
    assignedRole: user.assignedRole || null, deploymentStartDate: user.deploymentStartDate || null,
    clearanceStatus
  };
}

