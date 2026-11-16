import { scopedStudents } from './records.js';

export function adminDashboardModel(db = {}, user = {}, collegeFilter = 'ALL') {
  if (user?.role !== 'admin' || !db || typeof db !== 'object') {
    return { available: false };
  }

  const usersSource = Array.isArray(db.users) ? db.users : null;
  const htesSource = Array.isArray(db.htes) ? db.htes : null;
  const corpusSource = Array.isArray(db.policyCorpus) ? db.policyCorpus : null;
  const auditSource = Array.isArray(db.auditLogs) ? db.auditLogs : null;
  const settingsSource = db.collegeSettings && typeof db.collegeSettings === 'object' ? db.collegeSettings : null;

  if (!usersSource || !htesSource) {
    return { available: false };
  }

  const allStudents = scopedStudents(db, user, collegeFilter);
  const allPartners = htesSource.filter(
    item => collegeFilter === 'ALL' || item.college === collegeFilter || item.college === 'ALL'
  );

  const totalFilledSlots = allPartners.reduce((sum, h) => sum + (Number(h.filledSlots) || 0), 0);
  const totalMaxSlots = allPartners.reduce((sum, h) => sum + (Number(h.maxSlots) || 0), 0);

  const collegesList = settingsSource
    ? Object.keys(settingsSource).filter(code => code !== 'CBA' && code !== 'CED')
    : [];
  const collegeBreakdown = collegesList
    .filter(code => collegeFilter === 'ALL' || code === collegeFilter)
    .map(code => {
      const collegeCohort = usersSource.filter(u => u.role === 'student' && u.college === code);
      const coordinator = usersSource.find(u => u.role === 'coordinator' && u.college === code);
      const quota = settingsSource?.[code]?.requiredHours ?? null;
      const deployedCount = collegeCohort.filter(u => u.placementStatus === 'Approved & Deployed').length;
      const pendingCount = collegeCohort.filter(u => u.placementStatus === 'Pending Coordinator Endorsement').length;

      return {
        code,
        coordinatorName: coordinator?.name || 'Unassigned',
        quota: quota != null ? `${quota} hrs` : 'Not configured',
        totalInterns: collegeCohort.length,
        deployedCount,
        pendingCount
      };
    });

  const auditCount = auditSource
    ? auditSource.filter(item => collegeFilter === 'ALL' || item.college === collegeFilter || item.college === 'ALL').length
    : null;

  return {
    available: true,
    collegeFilter,
    availableColleges: collegesList,
    internsCount: allStudents.length,
    deployedCount: allStudents.filter(u => u.placementStatus === 'Approved & Deployed').length,
    pendingPlacementCount: allStudents.filter(u => u.placementStatus === 'Pending Coordinator Endorsement').length,
    partnersCount: allPartners.length,
    totalFilledSlots,
    totalMaxSlots,
    hasCapacityData: totalMaxSlots > 0,
    policyClausesCount: corpusSource ? corpusSource.length : null,
    auditEventsCount: auditCount,
    collegeBreakdown
  };
}