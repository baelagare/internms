import { scopedStudents } from './records.js';

const hasValue = value => value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '');
const safeHours = value => hasValue(value) && Number.isFinite(Number(value)) && Number(value) >= 0;

export function internDirectoryRecords(db = {}, user = {}, college = 'ALL') {
  if (!Array.isArray(db.users)) return { available: false, students: [] };
  const students = scopedStudents(db, user, college).map(student => {
    const logs = Array.isArray(db.logs) ? db.logs.filter(log => log.studentId === student.id || (log.studentId == null && student.name && log.student === student.name)) : null;
    const credited = logs?.filter(log => ['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(log.status)) ?? null;
    const hours = credited && credited.every(log => safeHours(log.hours))
      ? credited.reduce((sum, log) => sum + Number(log.hours), 0)
      : null;
    const rawQuota = db.collegeSettings?.[student.college]?.requiredHours;
    const quota = safeHours(rawQuota) && Number(rawQuota) > 0 ? Number(rawQuota) : null;
    const evaluation = Array.isArray(db.evaluations)
      ? db.evaluations.find(item => item.studentId === student.id || (item.studentId == null && item.studentName === student.name)) ?? null
      : null;
    return {
      ...student,
      directoryHours: hours,
      directoryQuota: quota,
      hoursAvailable: logs !== null,
      clearance: student.clearanceStatus || evaluation?.coordinatorClearanceStatus || null,
      evaluationAvailable: Array.isArray(db.evaluations),
      evaluationRecorded: Boolean(evaluation)
    };
  });
  return { available: true, students };
}
