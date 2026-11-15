// No inferred eligibility is presented as a real result.
export function placementRankings() { return []; }
export function placementEligibility() {
  return {
    hardEligible: null,
    gates: Object.fromEntries([
      ['collegeMatch', 'College eligibility'], ['gpaCutoff', 'GPA requirement'],
      ['disciplinaryClearance', 'Disciplinary clearance'],
      ['preDeploymentDocs', 'Document checklist'], ['slotAvailability', 'Slot availability']
    ].map(([key, label]) => [key, { pass: null, label, detail: 'Eligibility verification is unavailable.' }]))
  };
}
