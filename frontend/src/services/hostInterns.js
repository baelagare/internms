const hasValue = value => value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '');
const validHours = value => hasValue(value) && Number.isFinite(Number(value)) && Number(value) >= 0;

export function hostInternsModel(db = {}, user = {}) {
  if (user.role !== 'supervisor' || !user.company || !Array.isArray(db.users)) return { available: false, students: [] };
  const students = db.users.filter(student => student.role === 'student' && student.company === user.company);
  const logs = Array.isArray(db.logs) ? db.logs : null;
  const evaluations = Array.isArray(db.evaluations) ? db.evaluations.filter(record => record.company === user.company) : null;
  const disputes = Array.isArray(db.dtrDisputes) ? db.dtrDisputes : null;
  return {
    available: true,
    company: user.company,
    students: students.map(student => {
      const studentLogs = logs?.filter(log => log.studentId === student.id || (log.studentId == null && log.student === student.name)) ?? null;
      const credited = studentLogs?.filter(log => ['Supervisor Verified', 'Coordinator Approved'].includes(log.status)) ?? null;
      const hoursKnown = credited?.every(log => validHours(log.hours)) ?? false;
      const reviewedEvaluations = evaluations?.filter(item => item.studentId === student.id) ?? null;
      const pendingReports = studentLogs?.filter(log => log.status === 'Pending Supervisor Verification') ?? null;
      const attendanceRequests = disputes?.filter(item => item.studentId === student.id && item.status === 'Pending Supervisor Verification') ?? null;
      return {
        id: student.id,
        name: student.name || null,
        program: student.program || null,
        role: student.assignedRole || null,
        placementStatus: student.placementStatus || null,
        creditedHours: hoursKnown ? credited.reduce((sum, item) => sum + Number(item.hours), 0) : null,
        hoursAvailable: studentLogs !== null,
        pendingReports: pendingReports?.length ?? null,
        pendingAttendance: attendanceRequests?.length ?? null,
        evaluationRecorded: reviewedEvaluations ? reviewedEvaluations.length > 0 : null,
        evaluationAvailable: evaluations !== null
      };
    })
  };
}
