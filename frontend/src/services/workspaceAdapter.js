// Boundary adapter: preserve recorded values; never infer eligibility or clearance.
export function normalizeWorkspace(data) {
  if (!data || !Array.isArray(data.users) || !Array.isArray(data.htes)) {
    throw new Error('The API returned an invalid workspace response.');
  }
  const logs = (data.logs || []).map(log => ({
    ...log,
    apiId: log.apiId ?? (log.type === 'weekly_report' ? log.id : null),
    kind: log.kind || (log.type === 'weekly_report' ? 'weekly_task' : 'attendance'),
    weekNumber: log.weekNumber ?? log.week,
    date: log.date || log.createdAt?.slice(0, 10),
    title: log.title || (log.type === 'weekly_report' ? 'Weekly report' : 'Attendance'),
    description: log.description ?? log.summary,
    remarks: log.remarks ?? log.coordinatorNotes ?? log.supervisorNotes,
    status: log.status === 'Submitted' ? 'Pending Supervisor Verification' : log.status,
    ...Object.fromEntries(['amIn', 'amOut', 'pmIn', 'pmOut'].map(key => [key, log[key]?.slice(0, 5) || null]))
  }));
  return {
    ...data,
    connected: true,
    users: data.users.map(user => ({
      ...user,
      studentProfileId: user.studentProfileId ?? user.student_id ?? user.student?.id ?? null,
      portfolioData: { ...user.portfolioData, phone: user.portfolioData?.phone ?? user.phone ?? '' },
      preDeploymentDocs: user.preDeploymentDocs?.map(doc => ({ ...doc, code: doc.code ?? doc.docCode }))
    })),
    logs,
    collegeSettings: data.collegeSettings || {},
    dtrDisputes: (data.dtrDisputes || []).map(row => ({
      ...row, targetDate: row.targetDate ?? row.date,
      status: row.status === 'Pending' ? 'Pending Supervisor Verification' : row.status
    })),
    evaluations: (data.evaluations || []).map(row => ({
      ...row, evaluationPeriod: row.evaluationPeriod ?? row.period,
      averageRating: row.averageRating ?? row.averageScore,
      submittedAt: row.submittedAt ?? row.createdAt,
      maxScore: 95
    })),
    alerts: data.alerts || [], policyCorpus: data.policyCorpus || [],
    messages: data.messages || [], auditLogs: data.auditLogs || [], documents: data.documents || []
  };
}
