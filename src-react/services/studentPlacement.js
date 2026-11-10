import { computeSbertPlacementRankings, evaluateStage1Eligibility } from '../../src/services/sbertEngine.js';

// Presentation adapters only. Never change, normalize or re-score engine results here.
export const assignedCompany = student => student.company && !/^unassigned/i.test(student.company) ? student.company : '';
export const validMatchPercent = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
const recordedNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

export function hostCapacity(host) {
  if (!host || !recordedNumber(host.filledSlots) || !recordedNumber(host.maxSlots)) return null;
  const occupied = Number(host.filledSlots), total = Number(host.maxSlots);
  if (!Number.isInteger(occupied) || !Number.isInteger(total) || occupied < 0 || total < 0) return null;
  return { occupied, total, available: Math.max(0, total - occupied) };
}

export function placementRecommendations(student, db) {
  if (!Array.isArray(db.htes)) return { matches: [], error: 'Host organization records are unavailable. Reload your workspace to try again.' };
  try {
    return { matches: computeSbertPlacementRankings(student, db.htes, db.collegeSettings), error: '' };
  } catch {
    return { matches: [], error: 'Recommendations could not be calculated from the current records. Review your profile or contact your coordinator.' };
  }
}

export function eligibilityRows(student, host, settings, eligibility = evaluateStage1Eligibility(student, host, settings)) {
  const gates = eligibility.gates;
  const capacity = hostCapacity(host);
  const capacityConsistent = capacity && (capacity.available > 0 || student.company === host?.name) === gates.slotAvailability.pass;
  const docs = Array.isArray(student.preDeploymentDocs) ? student.preDeploymentDocs : [];
  const gpaKnown = recordedNumber(student.gpa) && Number(student.gpa) !== 0;
  const cutoff = host?.minGpa || settings?.[student.college]?.maxGpaCutoff;
  return [
    { key: 'college', label: 'College Eligibility', pass: host && student.college && host.college ? gates.collegeMatch.pass : null,
      detail: host ? student.college && host.college ? `${student.college} · Host college: ${host.college}${gates.collegeMatch.pass ? ' · College or target program matches' : ' · College / program requirement not met'}` : 'College information unavailable.' : `${student.college || 'College not recorded'} · Evaluated separately for each host.` },
    { key: 'gpa', label: 'GPA Requirement', pass: gpaKnown ? gates.gpaCutoff.pass : null,
      detail: gpaKnown ? `${gates.gpaCutoff.label}${cutoff ? '' : ' · Legacy default cutoff'}${host ? '' : ' · General cutoff; host limits may differ'}` : 'GPA not recorded. The legacy engine uses a fallback; eligibility is unconfirmed.' },
    { key: 'clearance', label: 'Disciplinary Clearance', pass: student.disciplinaryClearance ? gates.disciplinaryClearance.pass : null,
      detail: student.disciplinaryClearance || 'Clearance not recorded. Confirm with your coordinator.' },
    { key: 'checklist', label: 'Document Checklist', pass: docs.length ? gates.preDeploymentDocs.pass : null,
      detail: docs.length ? `${docs.filter(doc => doc.status === 'Verified').length} of ${docs.length} documents verified · Tracked separately from hard eligibility` : 'Document requirements unavailable or not yet assigned.' },
    { key: 'capacity', label: 'Slot Availability', pass: host && capacityConsistent ? gates.slotAvailability.pass : null,
      detail: !host ? 'Host-specific · Review availability below.' : capacity ? `${capacity.available} available · ${capacity.occupied} of ${capacity.total} occupied${!capacityConsistent ? ' · Legacy eligibility fallback differs from recorded capacity; confirm with your coordinator' : capacity.available === 0 && gates.slotAvailability.pass ? ' · Existing assignment exception applies' : ''}` : 'Capacity not recorded. Legacy defaults are not confirmed availability.' }
  ];
}

export function eligibilitySummary(rows, eligibility) {
  const hard = rows.filter(row => row.key !== 'checklist');
  const failed = hard.filter(row => row.pass === false);
  if (failed.length) return { label: 'Requirements Not Met', tone: 'warning', issues: failed.map(row => `${row.label}: ${row.detail}`), confirmed: false };
  if (hard.some(row => row.pass === null) || typeof eligibility?.hardEligible !== 'boolean') return { label: 'Eligibility Unconfirmed', tone: 'neutral', issues: ['Some eligibility information is unavailable. Confirm the missing records with your coordinator.'], confirmed: false };
  return { label: eligibility.hardEligible ? 'Eligible' : 'Requirements Not Met', tone: eligibility.hardEligible ? 'success' : 'warning', issues: [], confirmed: eligibility.hardEligible };
}

export function visibleRecommendations(matches, hosts, student, settings, sort = 'recommended', filter = 'all') {
  const result = matches.filter(match => {
    const host = hosts.find(item => item.id === match.hteId);
    if (filter === 'available') return (hostCapacity(host)?.available ?? 0) > 0;
    if (filter === 'eligible') return eligibilitySummary(eligibilityRows(student, host, settings, match.eligibility), match.eligibility).confirmed;
    return true;
  });
  if (sort === 'name') result.sort((a, b) => String(a.company).localeCompare(String(b.company)) || a.rank - b.rank);
  if (sort === 'highest' || sort === 'lowest') result.sort((a, b) => {
    const first = validMatchPercent(a.matchPercent), second = validMatchPercent(b.matchPercent);
    if (first === null || second === null) return first === second ? a.rank - b.rank : first === null ? 1 : -1;
    return (sort === 'highest' ? second - first : first - second) || a.rank - b.rank;
  });
  return result;
}

export function placementAction(student, match) {
  if (assignedCompany(student) === match.company) return { disabled: true, label: 'Already Assigned', detail: 'This is your current host assignment.' };
  const deployed = student.placementStatus === 'Approved & Deployed';
  if (student.preferredHte === match.company && (deployed || student.placementStatus === 'Pending Coordinator Endorsement')) return { disabled: true, label: deployed ? 'Preference Saved' : 'Request Pending', detail: 'Your preference is recorded for coordinator review; it is not an approval.' };
  if (!match.eligibility?.hardEligible) return { disabled: true, label: 'Requirements Not Met', detail: 'Review the unmet eligibility requirements above.' };
  return { disabled: false, label: deployed || student.preferredHte ? 'Update Preference' : 'Request Placement', detail: deployed ? 'Updates your preference only, not your deployed assignment.' : student.preferredHte ? 'Replaces your saved preference; coordinator approval is still required.' : 'Coordinator approval is required. Submitting does not reserve a slot.' };
}