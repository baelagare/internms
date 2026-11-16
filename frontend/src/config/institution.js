// Institution-approved college catalog mirrored from backend/database/seeders/CollegeSeeder.php.
// Keep this list limited to verified names; quotas and policy thresholds come from workspace records.
export const NEMSU_COLLEGES = Object.freeze({
  CAS: Object.freeze({ name: 'College of Arts and Sciences' }),
  CBM: Object.freeze({ name: 'College of Business and Management' }),
  CET: Object.freeze({ name: 'College of Engineering and Technology' }),
  CITE: Object.freeze({ name: 'College of Information Technology Education' }),
  CTE: Object.freeze({ name: 'College of Teacher Education' })
});

export const NEMSU_COLLEGE_PROGRAMS = Object.freeze({
  CAS: Object.freeze([
    'BA in Filipino',
    'BA in Economics',
    'BA in English',
    'BA in Political Science',
    'BS in Biology',
    'BS in Environmental Science',
    'BS in Mathematics',
    'BS in Midwifery'
  ]),
  CBM: Object.freeze([
    'Human Resource Management',
    'Financial Management',
    'Marketing Management',
    'Hospitality Management',
    'Public Administration'
  ]),
  CET: Object.freeze([
    'BS in Civil Engineering'
  ]),
  CITE: Object.freeze([
    'BS in Computer Science'
  ]),
  CTE: Object.freeze([
    'Bachelor of Early Childhood Education',
    'Bachelor of Elementary Education',
    'Bachelor of Physical Education',
    'Bachelor of Secondary Education major in English',
    'Bachelor of Secondary Education major in Filipino',
    'Bachelor of Secondary Education major in Mathematics',
    'Bachelor of Secondary Education major in Science'
  ])
});

export function collegeCodesForWorkspace(db = {}) {
  const recordedCodes = [
    ...Object.keys(db.collegeSettings || {}),
    ...(Array.isArray(db.users) ? db.users.map(item => item?.college) : []),
    ...(Array.isArray(db.htes) ? db.htes.map(item => item?.college) : []),
    ...(Array.isArray(db.alerts) ? db.alerts.map(item => item?.college) : []),
    ...(Array.isArray(db.auditLogs) ? db.auditLogs.map(item => item?.college) : [])
  ];
  return [...new Set([...Object.keys(NEMSU_COLLEGES), ...recordedCodes].filter(code => typeof code === 'string' && code.trim() && code !== 'ALL' && code !== 'CBA' && code !== 'CED'))].sort();
}

