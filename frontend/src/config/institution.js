// Institution-approved college catalog mirrored from backend/database/seeders/CollegeSeeder.php.
// Keep this list limited to verified names; quotas and policy thresholds come from workspace records.
export const NEMSU_COLLEGES = Object.freeze({
  CITE: Object.freeze({ name: 'College of Information Technology Education' }),
  CBA: Object.freeze({ name: 'College of Business Administration' }),
  CED: Object.freeze({ name: 'College of Education' }),
  CAS: Object.freeze({ name: 'College of Arts and Sciences' }),
  CET: Object.freeze({ name: 'College of Engineering and Technology' })
});

export function collegeCodesForWorkspace(db = {}) {
  const recordedCodes = [
    ...Object.keys(db.collegeSettings || {}),
    ...(Array.isArray(db.users) ? db.users.map(item => item?.college) : []),
    ...(Array.isArray(db.htes) ? db.htes.map(item => item?.college) : []),
    ...(Array.isArray(db.alerts) ? db.alerts.map(item => item?.college) : []),
    ...(Array.isArray(db.auditLogs) ? db.auditLogs.map(item => item?.college) : [])
  ];
  return [...new Set([...Object.keys(NEMSU_COLLEGES), ...recordedCodes].filter(code => typeof code === 'string' && code.trim() && code !== 'ALL'))].sort();
}
