export const studentLogs = (db, student) => (db.logs || []).filter(log => log.studentId === student.id || (!log.studentId && log.student === student.name));

export const approvedHours = (db, student) => studentLogs(db, student).filter(log => ['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(log.status)).reduce((sum, log) => sum + Number(log.hours || 0), 0);
