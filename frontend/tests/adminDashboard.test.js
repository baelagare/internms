import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adminDashboardModel } from '../src/services/adminDashboard.js';

const adminUser = { id: 'adm-1', role: 'admin' };
const mockDb = () => ({
  users: [
    { id: 's1', role: 'student', college: 'CITE', placementStatus: 'Approved & Deployed' },
    { id: 's2', role: 'student', college: 'CITE', placementStatus: 'Pending Coordinator Endorsement' },
    { id: 's3', role: 'student', college: 'CBM', placementStatus: 'Unplaced' },
    { id: 'c1', role: 'coordinator', college: 'CITE', name: 'Dr. Jane Smith' }
  ],
  htes: [
    { id: 'h1', name: 'Tech Corp', college: 'CITE', filledSlots: 3, maxSlots: 5 },
    { id: 'h2', name: 'Biz Inc', college: 'CBM', filledSlots: 2, maxSlots: 4 }
  ],
  policyCorpus: [{ chunkId: 'pol-1' }, { chunkId: 'pol-2' }],
  auditLogs: [
    { id: 'a1', college: 'CITE', actionType: 'CLEARANCE_GRANTED' },
    { id: 'a2', college: 'CBM', actionType: 'ALERT_DISMISSED' },
    { id: 'a3', college: 'ALL', actionType: 'POLICY_CREATED' }
  ],
  collegeSettings: {
    CITE: { requiredHours: 324 },
    CBM: { requiredHours: 600 }
  }
});

test('adminDashboardModel aggregates university-wide metrics accurately across colleges', () => {
  const model = adminDashboardModel(mockDb(), adminUser, 'ALL');
  assert.equal(model.available, true);
  assert.equal(model.internsCount, 3);
  assert.equal(model.deployedCount, 1);
  assert.equal(model.pendingPlacementCount, 1);
  assert.equal(model.partnersCount, 2);
  assert.equal(model.totalFilledSlots, 5);
  assert.equal(model.totalMaxSlots, 9);
  assert.equal(model.policyClausesCount, 2);
  assert.equal(model.auditEventsCount, 3);
  assert.equal(model.collegeBreakdown.length, 2);

  const cite = model.collegeBreakdown.find(c => c.code === 'CITE');
  assert.equal(cite.totalInterns, 2);
  assert.equal(cite.deployedCount, 1);
  assert.equal(cite.pendingCount, 1);
  assert.equal(cite.coordinatorName, 'Dr. Jane Smith');
  assert.equal(cite.quota, '324 hrs');

  const cbm = model.collegeBreakdown.find(c => c.code === 'CBM');
  assert.equal(cbm.totalInterns, 1);
  assert.equal(cbm.coordinatorName, 'Unassigned');
  assert.equal(cbm.quota, '600 hrs');
});

test('adminDashboardModel filters cohort and partners by college when specified', () => {
  const model = adminDashboardModel(mockDb(), adminUser, 'CITE');
  assert.equal(model.internsCount, 2);
  assert.equal(model.partnersCount, 1);
  assert.equal(model.collegeBreakdown.length, 1);
  assert.equal(model.collegeBreakdown[0].code, 'CITE');
});

test('adminDashboardModel returns unavailable for non-admin or missing sources', () => {
  assert.equal(adminDashboardModel(mockDb(), { role: 'student' }).available, false);
  assert.equal(adminDashboardModel(mockDb(), { role: 'coordinator' }).available, false);
  assert.equal(adminDashboardModel({}, adminUser).available, false);
});


test('admin dashboard view renders governance landmarks and quick access tools', () => {
  const source = readFileSync(new URL('../src/views/AdminDashboard.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/views/adminDashboard.css', import.meta.url), 'utf8');
  assert.match(source, /Administrator dashboard/);
  assert.match(source, /Administrative tools/);
  assert.match(source, /College compliance summary/);
  assert.match(source, /Policy corpus/);
  assert.match(source, /Audit trail/);
  assert.match(css, /admin-kpi-grid/);
  assert.match(css, /admin-table-region/);
});