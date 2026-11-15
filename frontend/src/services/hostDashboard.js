import { scopedStudents } from './records.js';

const validHours = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value)) && Number(value) >= 0;

export function hostDashboardModel(db, user) {
  if (user?.role !== 'supervisor' || !user.company || !db || !Array.isArray(db.users)) return { available: false };
  const students = scopedStudents(db, user);
  const studentIds = new Set(students.map(student => student.id));
  const owned = record => record?.studentId != null ? studentIds.has(record.studentId) : students.some(student => student.name && record?.student === student.name);
  const logsSource = Array.isArray(db.logs) ? db.logs : null;
  const evaluationSource = Array.isArray(db.evaluations) ? db.evaluations : null;
  const disputesSource = Array.isArray(db.dtrDisputes) ? db.dtrDisputes : null;
  if (!logsSource || !evaluationSource || !disputesSource) return { available: false };
  const pendingLogs = logsSource.filter(log => owned(log) && log.status === 'Pending Supervisor Verification');
  const pendingDisputes = disputesSource.filter(item => owned(item) && item.status === 'Pending Supervisor Verification');
  const evaluations = evaluationSource.filter(item => item.company === user.company && studentIds.has(item.studentId));
  return {
    available: true,
    company: user.company,
    students: students.map(student => ({
      id: student.id,
      name: student.name || 'Student',
      program: student.program || null,
      role: student.assignedRole || null,
      status: student.placementStatus || null,
      pendingReports: pendingLogs.filter(log => owned(log) && log.studentId === student.id).length,
      pendingAttendance: pendingDisputes.filter(item => item.studentId === student.id).length,
      creditedHours: logsSource.filter(log => owned(log) && log.studentId === student.id && ['Supervisor Verified', 'Coordinator Approved'].includes(log.status)).every(log => validHours(log.hours))
        ? logsSource.filter(log => owned(log) && log.studentId === student.id && ['Supervisor Verified', 'Coordinator Approved'].includes(log.status)).reduce((sum, log) => sum + Number(log.hours), 0)
        : null
    })),
    pendingReports: pendingLogs.length,
    pendingAttendance: pendingDisputes.length,
    completedEvaluations: evaluations.length,
    studentsWithEvaluations: new Set(evaluations.map(item => item.studentId)).size
  };
}
