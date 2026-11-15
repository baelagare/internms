const REVIEWABLE = new Set(['Supervisor Verified', 'Pending Coordinator Approval', 'Pending Coordinator Review']);
const validHours = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value)) && Number(value) >= 0;

const ownedByStudent = (record, student) => record?.studentId != null
  ? record.studentId === student.id
  : Boolean(student.name && record?.student === student.name);

export function coordinatorDashboardModel(db, user) {
  if (user?.role !== 'coordinator' || user.id == null || user.college == null || !db || typeof db !== 'object') {
    return { available: false };
  }

  const studentsSource = Array.isArray(db.users) ? db.users : null;
  const logsSource = Array.isArray(db.logs) ? db.logs : null;
  const disputesSource = Array.isArray(db.dtrDisputes) ? db.dtrDisputes : null;
  const alertsSource = Array.isArray(db.alerts) ? db.alerts : null;
  const partnersSource = Array.isArray(db.htes) ? db.htes : null;
  const evaluationsSource = Array.isArray(db.evaluations) ? db.evaluations : null;
  const requiredCollectionsAvailable = [studentsSource, logsSource, disputesSource, alertsSource, partnersSource, evaluationsSource].every(Array.isArray);
  if (!requiredCollectionsAvailable) return { available: false };

  const students = studentsSource.filter(item => item?.role === 'student' && item.college === user.college);
  const studentIds = new Set(students.map(item => item.id));
  const scoped = record => record?.studentId != null
    ? studentIds.has(record.studentId)
    : students.some(student => student.name && record?.student === student.name);
  const logs = logsSource.filter(scoped);
  const disputes = disputesSource.filter(scoped);
  const alerts = alertsSource.filter(scoped);
  const partners = partnersSource.filter(item => item.college === user.college);
  const evaluations = evaluationsSource.filter(scoped);
  const pendingLogs = logs.filter(item => REVIEWABLE.has(item.status));
  const pendingDisputes = disputes.filter(item => REVIEWABLE.has(item.status));
  const pendingEndorsements = students.filter(item => item.placementStatus === 'Pending Coordinator Endorsement');
  const activeAlerts = alerts.filter(item => !/dismissed|dispatched/i.test(String(item.hitlStatus || item.status || '')));
  const checklists = students.map(student => {
    const docs = Array.isArray(student.preDeploymentDocs) ? student.preDeploymentDocs : null;
    return { student, verified: docs?.filter(doc => doc.status === 'Verified').length ?? null, required: docs?.length ?? null };
  });
  const pendingItems = [
    ...pendingLogs.map(item => ({ id: item.id, type: 'Weekly report', studentName: item.student || students.find(s => s.id === item.studentId)?.name || 'Student', label: item.title || 'Weekly accomplishment report', route: 'approvals' })),
    ...pendingDisputes.map(item => ({ id: item.id, type: 'Attendance adjustment', studentName: item.student || students.find(s => s.id === item.studentId)?.name || 'Student', label: item.reason || 'Attendance adjustment request', route: 'approvals' })),
    ...pendingEndorsements.map(item => ({ id: item.id, type: 'Placement preference', studentName: item.name || 'Student', label: item.preferredHte || 'Placement preference awaiting review', route: 'placement' }))
  ];
  const requiredHours = db.collegeSettings?.[user.college]?.requiredHours;
  const hoursConfigured = validHours(requiredHours) && Number(requiredHours) > 0;
  const checklistComplete = checklists.filter(item => item.required != null && item.required > 0 && item.verified === item.required).length;
  return {
    available: true,
    college: user.college,
    studentsCount: students.length,
    partnersCount: partners.length,
    pendingItems,
    pendingCount: pendingItems.length,
    pendingWeeklyReports: pendingLogs.length,
    pendingAttendanceAdjustments: pendingDisputes.length,
    pendingPlacements: pendingEndorsements.length,
    activeAlertsCount: activeAlerts.length,
    activeAlerts,
    checklistComplete,
    checklistsAvailable: checklists.some(item => item.required != null),
    requiredHours: hoursConfigured ? Number(requiredHours) : null,
    partners,
    evaluationsCount: evaluations.length,
    students: students.map(student => ({
      id: student.id,
      name: student.name || 'Student',
      program: student.program || null,
      placementStatus: student.placementStatus || null,
      company: student.company || null,
      checklist: checklists.find(item => item.student.id === student.id) || null,
      hours: logs.filter(item => ownedByStudent(item, student) && ['Coordinator Approved', 'Supervisor Verified'].includes(item.status)).reduce((sum, item) => sum + (validHours(item.hours) ? Number(item.hours) : 0), 0)
    }))
  };
}
