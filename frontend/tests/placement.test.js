import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignedCompany,
  eligibilityRows,
  eligibilitySummary,
  hostCapacity,
  placementAction,
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

test('coordinator and admin placement views keep recommendations unavailable instead of inventing rankings', () => {
  const source = readFileSync(new URL('../src/views/Placement.jsx', import.meta.url), 'utf8');
  assert.match(source, /user\.role === 'coordinator'\) return <CoordinatorPlacement/);
  assert.match(source, /Placement recommendations and eligibility verification are unavailable until the backend is connected/);
  assert.match(source, /Recommendations unavailable/);
  assert.match(source, /Pending preferences/);
  assert.doesNotMatch(source, /cosine|% match/i);
});

