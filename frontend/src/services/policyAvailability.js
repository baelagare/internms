export function policyExplanation(alert, corpus = []) {
  if (!alert || !Array.isArray(corpus)) {
    return { synthesisText: '', retrievedClauses: [], outboundPayload: null, strippedPiiFields: [] };
  }

  const category = alert.ruleKey || alert.ruleCategory || alert.category;
  const retrievedClauses = category
    ? corpus.filter(clause => clause && (clause.ruleCategory === category || clause.rule_category === category))
    : [];

  const synthesisText = retrievedClauses.length > 0
    ? `Official regulatory and institutional standards applicable to ${alert.ruleLabel ? `"${alert.ruleLabel}"` : 'this risk indicator'}.`
    : '';

  return {
    synthesisText,
    retrievedClauses,
    outboundPayload: null,
    strippedPiiFields: []
  };
}

