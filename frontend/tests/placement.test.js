import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { placementRankings, placementEligibility } from '../src/services/placementAvailability.js';
import {
  assignedCompany,
  eligibilityRows,
  eligibilitySummary,
  hostCapacity,
  placementAction,
  placementRecommendations,
  validMatchPercent,
  visibleRecommendations
} from '../src/services/studentPlacement.js';

test('hostCapacity returns valid slot counts or null for missing capacity', () => {
  assert.deepEqual(hostCapacity({ filledSlots: 2, maxSlots: 5 }), { occupied: 2, total: 5, available: 3 });
  assert.deepEqual(hostCapacity({ filledSlots: 5, maxSlots: 5 }), { occupied: 5, total: 5, available: 0 });
  assert.equal(hostCapacity(null), null);
  assert.equal(hostCapacity({}), null);
  assert.equal(hostCapacity({ filledSlots: -1, maxSlots: 5 }), null);
  assert.equal(hostCapacity({ filledSlots: 'invalid', maxSlots: 5 }), null);
});

test('validMatchPercent validates 0-100 bounds and returns null for invalid values', () => {
  assert.equal(validMatchPercent(85), 85);
  assert.equal(validMatchPercent(0), 0);
  assert.equal(validMatchPercent(100), 100);
  assert.equal(validMatchPercent(-5), null);
  assert.equal(validMatchPercent(105), null);
  assert.equal(validMatchPercent(null), null);
  assert.equal(validMatchPercent(undefined), null);
  assert.equal(validMatchPercent(NaN), null);
});

test('assignedCompany returns active company or empty string for unassigned states', () => {
  assert.equal(assignedCompany({ company: 'Acme Software' }), 'Acme Software');
  assert.equal(assignedCompany({ company: 'Unassigned (Pending)' }), '');
  assert.equal(assignedCompany({ company: '' }), '');
  assert.equal(assignedCompany({}), '');
});

test('eligibilitySummary correctly reports confirmed eligibility or unmet requirements', () => {
  const metRows = [
    { key: 'college', pass: true, label: 'College', detail: 'Matches' },
    { key: 'gpa', pass: true, label: 'GPA', detail: 'Meets cutoff' },
    { key: 'clearance', pass: true, label: 'Clearance', detail: 'Cleared' },
    { key: 'capacity', pass: true, label: 'Slots', detail: '3 open' }
  ];
  const met = eligibilitySummary(metRows, { hardEligible: true });
  assert.equal(met.confirmed, true);
  assert.equal(met.label, 'Eligible');
  assert.equal(met.tone, 'success');

  const unmetRows = [
    { key: 'college', pass: false, label: 'College', detail: 'Mismatched program' },
    { key: 'gpa', pass: true, label: 'GPA', detail: 'Meets cutoff' }
  ];
  const unmet = eligibilitySummary(unmetRows, { hardEligible: false });
  assert.equal(unmet.confirmed, false);
  assert.equal(unmet.label, 'Requirements Not Met');
  assert.equal(unmet.tone, 'warning');

  const unconfirmedRows = [
    { key: 'college', pass: null, label: 'College', detail: 'Information unavailable' }
  ];
  const unconfirmed = eligibilitySummary(unconfirmedRows, {});
  assert.equal(unconfirmed.confirmed, false);
  assert.equal(unconfirmed.label, 'Eligibility Unconfirmed');
  assert.equal(unconfirmed.tone, 'neutral');
});

test('placementAction provides accurate buttons and labels across deployment states', () => {
  const student = { company: 'Current Corp', placementStatus: 'Approved & Deployed' };
  const currentAction = placementAction(student, { company: 'Current Corp', eligibility: { hardEligible: true } });
  assert.equal(currentAction.disabled, true);
  assert.equal(currentAction.label, 'Already Assigned');

  const unplacedStudent = { company: '', placementStatus: 'Unplaced', preferredHte: null };
  const requestAction = placementAction(unplacedStudent, { company: 'Target Corp', eligibility: { hardEligible: true } });
  assert.equal(requestAction.disabled, false);
  assert.equal(requestAction.label, 'Request Placement');

  const pendingStudent = { company: '', placementStatus: 'Pending Coordinator Endorsement', preferredHte: 'Pending Corp' };
  const pendingAction = placementAction(pendingStudent, { company: 'Pending Corp', eligibility: { hardEligible: true } });
  assert.equal(pendingAction.disabled, true);
  assert.equal(pendingAction.label, 'Request Pending');
});

test('visibleRecommendations filters and sorts opportunities accurately', () => {
  const matches = [
    { hteId: '1', company: 'Beta Corp', rank: 2, matchPercent: 60, eligibility: { hardEligible: true } },
    { hteId: '2', company: 'Alpha Corp', rank: 1, matchPercent: 90, eligibility: { hardEligible: true } }
  ];
  const hosts = [
    { id: '1', name: 'Beta Corp', filledSlots: 5, maxSlots: 5 }, // 0 open
    { id: '2', name: 'Alpha Corp', filledSlots: 1, maxSlots: 5 } // 4 open
  ];

  // Filter available only
  const availableOnly = visibleRecommendations(matches, hosts, {}, {}, 'recommended', 'available');
  assert.equal(availableOnly.length, 1);
  assert.equal(availableOnly[0].company, 'Alpha Corp');

  // Sort by company name
  const sortedByName = visibleRecommendations(matches, hosts, {}, {}, 'name', 'all');
  assert.equal(sortedByName[0].company, 'Alpha Corp');
  assert.equal(sortedByName[1].company, 'Beta Corp');
});

test('deployment readiness requires every configured required document to be verified', () => {
  const student = { college: 'CITE', gpa: 1.75, disciplinaryClearance: 'Cleared & Certified', preDeploymentDocs: [
    { docCode: 'MOA', status: 'Verified' },
    { docCode: 'INSURANCE', status: 'Pending Verification' }
  ] };
  const settings = { CITE: { maxGpaCutoff: 2.5, documentRequirements: [
    { docCode: 'MOA', isRequired: true, isActive: true },
    { docCode: 'INSURANCE', isRequired: true, isActive: true }
  ] } };
  const eligibility = placementEligibility(student, { college: 'CITE', maxSlots: 3, filledSlots: 0 }, settings);
  assert.equal(eligibility.deploymentReady, false);
  assert.match(eligibility.gates.preDeploymentDocs.detail, /1 of 2 required documents verified/);
  assert.equal(placementEligibility({ ...student, preDeploymentDocs: student.preDeploymentDocs.map(doc => ({ ...doc, status: 'Verified' })) }, { college: 'CITE', maxSlots: 3, filledSlots: 0 }, settings).deploymentReady, true);
});

test('placement ranking creates explainable ordered matches and preserves eligibility gates', () => {
  const student = { college: 'CITE', gpa: 1.75, disciplinaryClearance: 'Cleared & Certified', portfolioData: { skills: ['React', 'JavaScript', 'UI Design'], coursework: ['Web Development'] }, preDeploymentDocs: [{ status: 'Verified' }] };
  const hosts = [
    { id: 2, name: 'Data Team', college: 'CITE', requiredSkills: ['SQL', 'Python'], maxSlots: 4, filledSlots: 1, minGpa: 2.5 },
    { id: 1, name: 'Web Team', college: 'CITE', requiredSkills: ['React', 'JavaScript', 'UI Design'], maxSlots: 5, filledSlots: 2, minGpa: 2.5 }
  ];
  const ranked = placementRankings(student, hosts, { CITE: { maxGpaCutoff: 2.5 } });
  assert.equal(ranked[0].company, 'Web Team');
  assert.equal(ranked[0].matchPercent > ranked[1].matchPercent, true);
  assert.deepEqual(ranked[0].matchingSkills, ['React', 'JavaScript', 'UI Design']);
  assert.deepEqual(ranked[0].skillsGap, []);
  assert.equal(ranked[0].eligibility.hardEligible, true);
  assert.equal(placementEligibility({ ...student, gpa: 3.5 }, hosts[1], {}).gates.gpaCutoff.pass, false);
});

test('coordinator placement review renders AI placement recommendations from recorded host data', () => {
  const source = readFileSync(new URL('../src/views/Placement.jsx', import.meta.url), 'utf8');
  assert.match(source, /user\.role === 'coordinator'\) return <CoordinatorPlacement/);
  assert.match(source, /AI Placement Recommendations/);
  assert.match(source, /rankings\.map/);
  assert.match(source, /Pending Preferences/);
});

test('coordinator can select an eligible recommendation and submit its assignment confirmation', () => {
  const source = readFileSync(new URL('../src/views/Placement.jsx', import.meta.url), 'utf8');
  assert.match(source, /disabled=\{busy \|\| match\.eligibility\.hardEligible !== true \|\| match\.eligibility\.deploymentReady !== true\}/);
  assert.match(source, /Documents Incomplete/);
  assert.match(source, /Deployment blocked: documents incomplete/);
  assert.match(source, /onClick=\{\(\) => \{ setReason\(''\); setAssignedRole\(match\.roleTitle \|\| ''\); setConfirmation\(match\); \}\}/);
  assert.match(source, /title="Confirm Placement Assignment"/);
  assert.match(source, /savePlacement\(user, student\.id, confirmation\.hteId, reason, assignedRole\)/);
  assert.match(source, /label="Assigned Role"/);
  assert.match(source, /'Placement decision recorded and partner capacity updated\.'/);
  assert.match(source, /savePlacement\(user, student\.id, confirmation\.hteId, reason, assignedRole\)[\s\S]*?setConfirmation\(null\); setSelected\(null\); setReason\(''\); setAssignedRole\(''\);/);
});

test('student preference dialog accepts and persists a preferred role distinct from assignment', () => {
  const view = readFileSync(new URL('../src/views/StudentPlacement.jsx', import.meta.url), 'utf8');
  const service = readFileSync(new URL('../src/services/applicationService.js', import.meta.url), 'utf8');
  assert.match(view, /label="Preferred Role"/);
  assert.match(view, /savePlacement\(student, student\.id, match\.hteId, undefined, preferredRole\)/);
  assert.match(service, /user\.role === 'student' \? 'preferred_role' : 'assigned_role'/);
});

test('coordinator placement review exposes the return-for-revision decision and reason form', () => {
  const source = readFileSync(new URL('../src/views/Placement.jsx', import.meta.url), 'utf8');
  const service = readFileSync(new URL('../src/services/applicationService.js', import.meta.url), 'utf8');
  assert.match(source, /student\.placementStatus === 'Pending Coordinator Endorsement'/);
  assert.match(source, /Return preference for revision/);
  assert.match(source, /Reason for returning preference/);
  assert.match(source, /returnPlacementPreference\(user, student\.id, returnReason\)/);
  assert.match(service, /placement\/return/);
});

test('student placement recommendations show returned preference feedback and permit revision', () => {
  const view = readFileSync(new URL('../src/views/StudentPlacement.jsx', import.meta.url), 'utf8');
  assert.match(view, /Returned for Revision/);
  assert.match(view, /student\.preferenceFeedback/);
  assert.match(view, /submit an updated preference/);
});

test('student placement recommendations use supplied workspace hosts and provide AI recommendations', () => {
  const result = placementRecommendations({ college: 'CITE', gpa: 1.75, portfolioData: { skills: ['React'], coursework: ['Web Development'] } }, {
    htes: [{ id: 1, name: 'Web Studio', college: 'CITE', requiredSkills: ['React'], minGpa: 2.5, maxSlots: 2, filledSlots: 1 }], collegeSettings: { CITE: { maxGpaCutoff: 2.5 } }
  });
  assert.equal(result.error, null);
  assert.equal(result.matches[0].company, 'Web Studio');
  const view = readFileSync(new URL('../src/views/StudentPlacement.jsx', import.meta.url), 'utf8');
  assert.match(view, /AI Placement Recommendations/);
});

test('coordinator placement review shows Current placement and Already Assigned for currently deployed host', () => {
  const source = readFileSync(new URL('../src/views/Placement.jsx', import.meta.url), 'utf8');
  assert.match(source, /isCurrent \? \(\s*<Button variant="secondary" disabled>Already Assigned<\/Button>/);
  assert.match(source, /Current placement/);
});

