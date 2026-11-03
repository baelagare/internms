/**
 * Stage 1 Deterministic Early-Warning Rules Engine
 * Evaluates Attendance Risk, Task Misalignment, and Documentation Deficit against college thresholds.
 */

export const RULE_METADATA = {
  RULE_A_ATTENDANCE: {
    ruleId: 'RULE_A_ATTENDANCE',
    ruleCode: 'Attendance',
    ruleLabel: 'Attendance risk',
    badgeClass: 'badge-rule-a',
    shortDesc: 'Consecutive unexcused absences or hours deficit exceeds college limit'
  },
  RULE_B_MISALIGNMENT: {
    ruleId: 'RULE_B_MISALIGNMENT',
    ruleCode: 'Task Fit',
    ruleLabel: 'Task mismatch',
    badgeClass: 'badge-rule-b',
    shortDesc: 'Non-degree clerical tasks logged across consecutive weeks'
  },
  RULE_C_DOCS: {
    ruleId: 'RULE_C_DOCS',
    ruleCode: 'Documents',
    ruleLabel: 'Missing documents',
    badgeClass: 'badge-rule-c',
    shortDesc: 'Pre-deployment documents still unverified after deployment start'
  }
};

export function evaluateStudentDeterministicRules(student, logs = [], collegeSettings = {}) {
  const college = student.college || 'CITE';
  const cfg = collegeSettings[college] || {
    requiredHours: 324,
    ruleAMaxConsecutiveAbsences: 3,
    ruleAMaxDeficitPct: 15,
    ruleBConsecutiveWeeks: 3,
    ruleBClericalKeywords: ['photocopying', 'xerox', 'coffee errands', 'personal errands', 'buying snacks', 'janitorial', 'unrelated filing', 'shredding papers']
  };

  const triggeredFlags = [];

  // 1. Documentation Deficit
  const docs = Array.isArray(student.preDeploymentDocs) ? student.preDeploymentDocs : [];
  const missingDocs = docs.filter(d => d.status !== 'Verified');
  if (student.deploymentStartDate && missingDocs.length > 0) {
    const start = new Date(student.deploymentStartDate);
    const now = new Date('2026-11-02');
    const daysPastDeployment = Math.max(1, Math.round((now - start) / (1000 * 60 * 60 * 24)));
    if (daysPastDeployment > 0) {
      triggeredFlags.push({
        ruleId: 'RULE_C_DOCS',
        ruleCode: 'Documents',
        ruleLabel: 'Missing documents',
        severity: 'compliance',
        triggers: [`${missingDocs.length} pre-deployment document(s) unverified after start date`],
        evidence: {
          deploymentStartDate: student.deploymentStartDate,
          daysPastDeployment,
          verifiedCount: docs.length - missingDocs.length,
          requiredCount: docs.length || 5,
          missingDocs: missingDocs.map(d => ({
            code: d.code,
            title: d.title,
            status: d.status
          }))
        },
        retrievedClauseIds: ['CHED-CMO104-ART8-SEC19', 'NEMSU-MAN26-SEC4-1']
      });
    }
  }

  // 2. Task Misalignment
  const studentLogs = logs.filter(l => l.studentId === student.id || l.student === student.name);
  const keywords = (cfg.ruleBClericalKeywords || []).map(k => k.toLowerCase());
  const flaggedLogs = [];

  for (const log of studentLogs) {
    const text = `${log.title || ''} ${log.description || ''}`.toLowerCase();
    const matched = keywords.filter(kw => kw && text.includes(kw));
    if (matched.length > 0) {
      flaggedLogs.push({
        week: `Week ${log.weekNumber || '?'} (${log.date || 'Logged'})`,
        title: log.title,
        matchedKeywords: matched
      });
    }
  }

  if (flaggedLogs.length >= (cfg.ruleBConsecutiveWeeks || 3)) {
    triggeredFlags.push({
      ruleId: 'RULE_B_MISALIGNMENT',
      ruleCode: 'Task Fit',
      ruleLabel: 'Task mismatch',
      severity: 'warning',
      triggers: [
        `${flaggedLogs.length} consecutive weeks of clerical tasks`,
        'Matched non-degree errand terms'
      ],
      evidence: {
        consecutiveWeeksFlagged: flaggedLogs.length,
        thresholdWeeks: cfg.ruleBConsecutiveWeeks || 3,
        flaggedLogs,
        targetCompetenciesMissed: ['Core degree practical competencies']
      },
      retrievedClauseIds: ['CHED-CMO104-ART5-SEC10', 'NEMSU-MAN26-SEC4-5']
    });
  }

  return triggeredFlags;
}

export function getRuleBadgeMeta(ruleId) {
  return RULE_METADATA[ruleId] || RULE_METADATA.RULE_A_ATTENDANCE;
}
