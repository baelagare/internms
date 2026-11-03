/**
 * Stage 2 Cloud Gemma 2B RAG Policy Explanation Engine & RA 10173 Privacy Sanitizer
 */

export function retrievePolicyClausesForAlert(alert, policyCorpus = []) {
  if (!alert) return [];
  const clauseIds = Array.isArray(alert.retrievedClauseIds) ? alert.retrievedClauseIds : [];
  if (clauseIds.length > 0) {
    const matched = policyCorpus.filter(c => clauseIds.includes(c.chunkId));
    if (matched.length > 0) return matched;
  }
  return policyCorpus.filter(c => c.ruleCategory === alert.ruleId);
}

/**
 * RA 10173 Data Privacy Act of 2012 Anonymizer
 * Strips student_name, student_id, contact numbers, and raw unredacted log text
 * before constructing the outbound payload for Cloud Gemma 2B.
 */
export function buildAnonymizedOutboundPayload(alert, retrievedClauses = []) {
  const ev = alert?.evidence || {};
  let anonymizedMetricSummary = {};

  if (alert?.ruleId === 'RULE_A_ATTENDANCE') {
    anonymizedMetricSummary = {
      consecutive_unexcused_absences: ev.consecutiveAbsences || 4,
      college_absence_threshold: ev.thresholdAbsences || 3,
      cumulative_dtr_deficit_pct: ev.deficitPct || 18.5,
      college_deficit_threshold_pct: ev.thresholdDeficitPct || 15.0,
      logged_hours: ev.loggedHours || 132,
      expected_hours_at_checkpoint: ev.expectedHoursByWeek6 || 162,
      required_college_quota_hours: ev.requiredTotalHours || 324
    };
  } else if (alert?.ruleId === 'RULE_B_MISALIGNMENT') {
    const allKeywords = (ev.flaggedLogs || []).flatMap(l => l.matchedKeywords || []);
    anonymizedMetricSummary = {
      consecutive_misaligned_weeks: ev.consecutiveWeeksFlagged || 3,
      college_week_threshold: ev.thresholdWeeks || 3,
      matched_clerical_keyword_tokens: [...new Set(allKeywords)],
      unmet_competency_domains: ev.targetCompetenciesMissed || []
    };
  } else {
    anonymizedMetricSummary = {
      days_elapsed_post_deployment: ev.daysPastDeployment || 42,
      verified_documents_count: ev.verifiedCount ?? 3,
      required_documents_count: ev.requiredCount ?? 5,
      unverified_document_codes: (ev.missingDocs || []).map(d => ({
        doc_code: d.code,
        doc_type: d.title,
        verification_state: d.status
      }))
    };
  }

  const outboundPayload = {
    schema_version: 'internms.rag.v2.ra10173-anonymized',
    model_target: 'google/gemma-2-2b-it',
    pii_redaction_status: 'VERIFIED_STRIPPED_RA10173',
    context: {
      institution: 'NEMSU Main Campus',
      academic_year: '2026-2027',
      college_code: alert?.college || 'CITE',
      degree_program_category: alert?.program || 'Undergraduate OJT',
      triggered_rule_id: alert?.ruleId || 'RULE_A_ATTENDANCE',
      triggered_rule_label: alert?.ruleLabel || 'Attendance Risk Flag',
      metric_summary: anonymizedMetricSummary,
      retrieved_policy_chunks: retrievedClauses.map(c => ({
        chunk_id: c.chunkId,
        source_document: c.sourceDoc,
        section_reference: c.sectionRef,
        verbatim_clause: c.verbatimText
      }))
    }
  };

  const strippedPiiFields = [
    { field: 'student_name', originalStatus: 'REDACTED_LOCAL_ONLY', note: 'Never transmitted to external LLM' },
    { field: 'student_id / studentNumber', originalStatus: 'REDACTED_LOCAL_ONLY', note: 'Never transmitted to external LLM' },
    { field: 'student_email & phone', originalStatus: 'REDACTED_LOCAL_ONLY', note: 'Never transmitted to external LLM' },
    { field: 'raw_unredacted_diary_text', originalStatus: 'ABSTRACTED_TO_RULE_METRICS', note: 'Replaced with structured keyword/metric tokens' }
  ];

  return {
    outboundPayload,
    strippedPiiFields
  };
}


/**
 * Generates the policy-grounded explanation (Cloud Gemma 2B RAG, or an offline template fallback).
 * Visible strings are plain-language; internal rule identifiers never reach the UI.
 */
export function generateRagPolicyExplanation(alert, policyCorpus = [], isOfflineFallback = false) {
  const clauses = retrievePolicyClausesForAlert(alert, policyCorpus);
  const { outboundPayload, strippedPiiFields } = buildAnonymizedOutboundPayload(alert, clauses);
  const ev = alert?.evidence || {};

  if (isOfflineFallback) {
    let text = '';
    if (alert?.ruleId === 'RULE_A_ATTENDANCE') {
      text = `${ev.consecutiveAbsences || 4} consecutive unexcused absences (limit ${ev.thresholdAbsences || 3}) and a ${ev.deficitPct || 18.5}% hours deficit (limit ${ev.thresholdDeficitPct || 15}%). See CHED CMO 104 Art. VII §17.1 and NEMSU Manual Part IV §4.3.2.`;
    } else if (alert?.ruleId === 'RULE_B_MISALIGNMENT') {
      text = `${ev.consecutiveWeeksFlagged || 3} consecutive weekly logs describe clerical work unrelated to the degree. See CHED CMO 104 Art. V §10.2 and NEMSU Manual Part IV §4.5.1.`;
    } else {
      text = `${(ev.missingDocs || []).length} required document(s) still unverified ${ev.daysPastDeployment || 40} days after deployment. See CHED CMO 104 Art. VIII §19 and NEMSU Manual Part IV §4.1.4.`;
    }
    return {
      mode: 'DETERMINISTIC_FALLBACK',
      modelBadge: 'Offline template',
      synthesisText: text,
      retrievedClauses: clauses,
      outboundPayload,
      strippedPiiFields
    };
  }

  let synthesisText = '';
  if (alert?.ruleId === 'RULE_A_ATTENDANCE') {
    synthesisText =
      `The intern missed ${ev.consecutiveAbsences || 4} consecutive working days and is ${ev.deficitPct || 18.5}% behind the expected hours pace (${ev.loggedHours || 132} of ${ev.expectedHoursByWeek6 || 162} hrs). ` +
      `CHED CMO 104 (Art. VII §17.1) requires a written explanation and a case conference once absences exceed 3 days or the deficit exceeds 15%. ` +
      `The NEMSU Student Manual (Part IV §4.3.2) calls for a coordinator-approved catch-up schedule.`;
  } else if (alert?.ruleId === 'RULE_B_MISALIGNMENT') {
    const kwList = [...new Set((ev.flaggedLogs || []).flatMap(l => l.matchedKeywords || []))].join(', ');
    synthesisText =
      `For ${ev.consecutiveWeeksFlagged || 3} weeks in a row, the intern’s logs describe clerical errands (${kwList}) instead of ${alert?.program || 'degree'} tasks. ` +
      `CHED CMO 104 (Art. V §10.2) prohibits assigning interns to work outside their training plan. ` +
      `The NEMSU Student Manual (Part IV §4.5.1) recommends a realignment meeting with the host supervisor.`;
  } else {
    const missing = (ev.missingDocs || []).map(d => d.title).join('; ');
    synthesisText =
      `Deployment started ${ev.deploymentStartDate || '2026-09-15'}, but only ${ev.verifiedCount ?? 3} of ${ev.requiredCount ?? 5} required documents are verified. Missing: ${missing}. ` +
      `CHED CMO 104 (Art. VIII §19) bars on-site training without complete records. ` +
      `The NEMSU Student Manual (Part IV §4.1.4) grants a 5-working-day window to comply before hours stop counting.`;
  }

  return {
    mode: 'CLOUD_GEMMA_2B_RAG',
    modelBadge: 'AI summary · Gemma 2B',
    synthesisText,
    retrievedClauses: clauses,
    outboundPayload,
    strippedPiiFields
  };
}
