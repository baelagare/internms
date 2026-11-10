import { approvedHours } from './training.js';

// Presentation only: completion criteria and credited-hour calculation remain unchanged.
export const statusTone = status => ({
  Completed: 'success', 'Approved & Deployed': 'success', 'Cleared & Certified': 'success',
  'In Progress': 'blue', 'Requires Attention': 'warning'
}[status] || 'neutral');
export const belongsToStudent = (item, user, nameKey = 'student') => item.studentId === user.id || (!item.studentId && item[nameKey] === user.name);

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
  const skills = user.portfolioData?.skills?.length || 0;
  const docsDone = required != null && verified === required;
  const deployed = user.placementStatus === 'Approved & Deployed';
  const hoursDone = hours != null && quota != null && hours >= quota;
  const attention = docs.some(item => /returned|revision|rejected/i.test(item.status || ''));
  const steps = [
    { title: 'Profile & Skills', route: 'profile', action: 'View profile', status: skills >= 3 ? 'Completed' : 'In Progress', detail: `${skills} skills recorded · at least 3 required` },
    { title: 'Pre-deployment Checklist', route: 'checklist', action: 'Review checklist', status: docsDone ? 'Completed' : attention ? 'Requires Attention' : docs.some(item => item.fileName) ? 'In Progress' : 'Pending', detail: required == null ? 'Requirements unavailable' : `${verified} of ${required} documents verified` },
    { title: 'Placement Preference', route: 'placement', action: 'View preference', status: user.preferredHte ? 'Completed' : 'Pending', detail: user.preferredHte || 'No preferred host submitted' },
    { title: 'Coordinator Deployment Approval', route: 'placement', action: 'View placement', status: deployed ? 'Completed' : /rejected|returned/i.test(user.placementStatus || '') ? 'Requires Attention' : /pending|review/i.test(user.placementStatus || '') ? 'In Progress' : 'Pending', detail: user.placementStatus || 'Awaiting placement decision' },
    { title: 'Required Hours', route: 'attendance', action: 'View attendance', status: hoursDone ? 'Completed' : hours > 0 || deployed ? 'In Progress' : 'Pending', detail: `${hours ?? '—'} of ${quota ?? '—'} verified / approved hours` },
    { title: 'Final Evaluation & Clearance', route: 'tasks', action: 'View task logs', status: user.clearanceStatus === 'Cleared & Certified' ? 'Completed' : /For Improvement/i.test(evaluation?.recommendation || '') ? 'Requires Attention' : evaluation ? 'In Progress' : 'Pending', detail: user.clearanceStatus || 'Awaiting evaluation and coordinator clearance' }
  ];
  return { verified, required, hours, quota, percent, evaluation, alerts, steps };
}
