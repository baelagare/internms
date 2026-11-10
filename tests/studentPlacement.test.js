import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeSbertPlacementRankings } from '../src/services/sbertEngine.js';
import { assignedCompany, eligibilityRows, eligibilitySummary, hostCapacity, placementAction, placementRecommendations, validMatchPercent, visibleRecommendations } from '../src-react/services/studentPlacement.js';
import { changePlacement } from '../src-react/services/placement.js';
import { createLocalRepository } from '../src-react/services/localRepository.js';
const seed = JSON.parse(readFileSync(new URL('../database.json', import.meta.url)));
const setup = () => { const db = structuredClone(seed); return { db, student: db.users.find(user => user.id === 'student') }; };

test('presentation preserves every original ranking, score, skill and coursework result', () => {
  const { db, student } = setup();
  const expected = computeSbertPlacementRankings(student, db.htes, db.collegeSettings);
  assert.deepEqual(placementRecommendations(student, db).matches, expected);
  assert.deepEqual(expected.map(match => match.matchPercent), [91, 74, 69, 59, 28]);
  assert.deepEqual(visibleRecommendations(expected, db.htes, student, db.collegeSettings), expected);
});
test('capacity uses source occupied/total values and never engine defaults', () => {
  assert.deepEqual(hostCapacity({ filledSlots: 1, maxSlots: 5 }), { occupied: 1, total: 5, available: 4 });
  assert.equal(hostCapacity({ filledSlots: 0, maxSlots: 6 }).available, 6);
  assert.equal(hostCapacity({ filledSlots: 0, maxSlots: 0 }).available, 0);
  assert.equal(hostCapacity({ filledSlots: 6, maxSlots: 5 }).available, 0);
  for (const host of [null, {}, { filledSlots: null, maxSlots: 5 }, { filledSlots: -1, maxSlots: 5 }, { filledSlots: 0, maxSlots: 'bad' }]) assert.equal(hostCapacity(host), null);
});
test('missing and invalid scores are not normalized or turned into zero', () => {
  for (const value of [null, undefined, '', '91', NaN, Infinity, -1, 101]) assert.equal(validMatchPercent(value), null);
  for (const value of [0, 28, 91, 100]) assert.equal(validMatchPercent(value), value);
});
test('zero capacity legacy fallback cannot display confirmed availability', () => {
  const { db, student } = setup(); student.company = '';
  const host = { ...db.htes[0], maxSlots: 0, filledSlots: 0 };
  const rows = eligibilityRows(student, host, db.collegeSettings);
  assert.equal(rows.find(row => row.key === 'capacity').pass, null);
  assert.equal(eligibilitySummary(rows, { hardEligible: true }).confirmed, false);
});
test('sorts and filters compose without changing source records or original ranks', () => {
  const { db, student } = setup(), matches = placementRecommendations(student, db).matches, snapshot = structuredClone(matches);
  const lowest = visibleRecommendations(matches, db.htes, student, db.collegeSettings, 'lowest');
  assert.deepEqual(lowest.map(match => match.rank), [5, 4, 3, 2, 1]);
  const names = visibleRecommendations(matches, db.htes, student, db.collegeSettings, 'name').map(match => match.company);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  db.htes.forEach(host => { host.filledSlots = host.maxSlots; });
  assert.equal(visibleRecommendations(matches, db.htes, student, db.collegeSettings, 'lowest', 'available').length, 0);
  assert.deepEqual(matches, snapshot);
});
test('host-specific GPA and disciplinary gates are separate from checklist and skill gaps', () => {
  const { db, student } = setup();
  student.gpa = 2.6;
  student.preDeploymentDocs.forEach(doc => { doc.status = 'Not Uploaded'; });
  const matches = placementRecommendations(student, db).matches;
  for (const match of matches) {
    const host = db.htes.find(host => host.id === match.hteId), rows = eligibilityRows(student, host, db.collegeSettings, match.eligibility);
    assert.equal(rows.find(row => row.key === 'gpa').pass, student.gpa <= host.minGpa);
    assert.equal(rows.find(row => row.key === 'checklist').pass, false);
    assert.equal(eligibilitySummary(rows, match.eligibility).confirmed, match.eligibility.hardEligible);
  }
  student.disciplinaryClearance = 'On Hold';
  assert.ok(placementRecommendations(student, db).matches.every(match => !match.eligibility.hardEligible));
});
test('missing eligibility inputs never show confirmed success despite legacy defaults', () => {
  const { db, student } = setup();
  delete student.gpa; delete student.disciplinaryClearance; delete student.college;
  const host = db.htes[0]; delete host.filledSlots;
  const rows = eligibilityRows(student, host, db.collegeSettings);
  for (const key of ['college', 'gpa', 'clearance', 'capacity']) assert.equal(rows.find(row => row.key === key).pass, null);
  assert.equal(eligibilitySummary(rows, { hardEligible: true }).label, 'Eligibility Unconfirmed');
  assert.equal(eligibilityRows(student, null, db.collegeSettings).find(row => row.key === 'capacity').pass, null);
});
test('empty/malformed records have explicit errors without fake recommendations', () => {
  const { db, student } = setup();
  assert.deepEqual(placementRecommendations(student, { ...db, htes: [] }), { matches: [], error: '' });
  assert.ok(placementRecommendations(student, { ...db, htes: null }).error);
  student.portfolioData.skills = {};
  assert.ok(placementRecommendations(student, db).error);
});
test('current assignment is distinguished; deployed preference changes do not reassign', () => {
  const { db, student } = setup(), before = { company: student.company, role: student.assignedRole, slots: db.htes.map(host => host.filledSlots) };
  const matches = placementRecommendations(student, db).matches;
  assert.equal(placementAction(student, matches[0]).label, 'Already Assigned');
  assert.equal(placementAction(student, matches[1]).label, 'Update Preference');
  changePlacement(db, student, student.id, matches[1].hteId);
  assert.equal(student.company, before.company); assert.equal(student.assignedRole, before.role);
  assert.deepEqual(db.htes.map(host => host.filledSlots), before.slots);
  assert.equal(placementAction(student, matches[1]).label, 'Preference Saved');
  const auditCount = db.auditLogs.length;
  assert.throws(() => changePlacement(db, student, student.id, matches[1].hteId), /already saved/);
  assert.equal(db.auditLogs.length, auditCount);
});
test('unplaced request transitions to pending, duplicate rejected, replacement remains single preference', () => {
  const { db, student } = setup(); student.company = ''; student.placementStatus = 'Unplaced'; student.preferredHte = '';
  const matches = placementRecommendations(student, db).matches;
  assert.equal(placementAction(student, matches[0]).label, 'Request Placement');
  changePlacement(db, student, student.id, matches[0].hteId);
  assert.equal(student.placementStatus, 'Pending Coordinator Endorsement'); assert.equal(assignedCompany(student), '');
  assert.equal(placementAction(student, matches[0]).label, 'Request Pending');
  assert.throws(() => changePlacement(db, student, student.id, matches[0].hteId), /already saved/);
  changePlacement(db, student, student.id, matches[1].hteId);
  assert.equal(student.preferredHte, matches[1].company);
});
test('submission rechecks full capacity and unchanged coordinator approval updates capacity', () => {
  const { db, student } = setup(); student.company = ''; student.placementStatus = 'Unplaced'; student.preferredHte = '';
  const host = db.htes[0], filled = host.filledSlots;
  host.filledSlots = host.maxSlots;
  assert.throws(() => changePlacement(db, student, student.id, host.id), /eligibility/);
  host.filledSlots = filled;
  changePlacement(db, student, student.id, host.id);
  changePlacement(db, db.users.find(user => user.id === '1234'), student.id, host.id);
  assert.equal(student.placementStatus, 'Approved & Deployed'); assert.equal(student.company, host.name);
  assert.equal(host.filledSlots, filled + 1);
});
test('repository persistence failure does not commit request state', () => {
  const { db, student } = setup();
  const raw = JSON.stringify(db);
  const repo = createLocalRepository(db, { getItem: () => raw, setItem: () => { throw new Error('quota'); } });
  assert.throws(() => repo.transact(next => changePlacement(next, student, student.id, db.htes[1].id)), /not been committed/);
  assert.equal(JSON.stringify(repo.read()), raw);
});