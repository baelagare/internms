import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scopedStudents } from '../src/services/records.js';

const user = { id: 'coord-1', role: 'coordinator', college: 'C1' };
const db = {
  users: [
    { id: 'student-1', role: 'student', college: 'C1', name: 'Student One', preDeploymentDocs: [{ id: 'doc1', status: 'Verified', fileName: 'evidence.pdf' }] },
    { id: 'student-2', role: 'student', college: 'C2', name: 'Student Two', preDeploymentDocs: [{ id: 'doc2', status: 'Pending' }] }
  ],
  logs: [
    { id: 'log1', studentId: 'student-1', status: 'Supervisor Verified', kind: 'weekly_task' },
    { id: 'log2', studentId: 'student-1', status: 'Pending Supervisor Verification' }
  ],
  dtrDisputes: [{ id: 'dispute1', studentId: 'student-1', status: 'Supervisor Verified' }]
};

test('coordinator approvals source records are scoped to the coordinator college', () => {
  assert.deepEqual(scopedStudents(db, user).map(student => student.id), ['student-1']);
});

test('approval review eligibility remains stage and category specific', () => {
  const source = readFileSync(new URL('../src/views/Approvals.jsx', import.meta.url), 'utf8');
  assert.match(source, /user\.role === 'supervisor' \? 'Pending Supervisor Verification' : 'Supervisor Verified'/);
  assert.match(source, /category === 'document' \? Boolean\(row\.fileName\) : row\.status === expected/);
  assert.match(source, /reviewSubmission\(/);
});

test('host approvals explain supervisor verification and separate coordinator credit', () => {
  const source = readFileSync(new URL('../src/views/Approvals.jsx', import.meta.url), 'utf8');
  assert.match(source, /Company Review Queue/);
  assert.match(source, /Supervisor Verification/);
  assert.match(source, /Final OJT credit is decided by the college coordinator/);
  assert.match(source, /item\.college === user\.college|scopedStudents\(safeDb, user\)/);
  assert.match(source, /safeDb\.dtrDisputes/);
});

test('coordinator approvals provide readable queue counts and empty state without fake data', () => {
  const source = readFileSync(new URL('../src/views/Approvals.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/views/approvals.css', import.meta.url), 'utf8');
  assert.match(source, /Coordinator Approvals/);
  assert.match(source, /Needs Review/);
  assert.match(source, /Approved \/ Verified/);
  assert.match(source, /No Submissions In This View/);
  assert.match(css, /approvals-summary/);
  assert.match(css, /min-height: 72px/);
});

test('coordinator review pages follow the shared three-metric KPI rule for record-driven queues', () => {
  const approvals = readFileSync(new URL('../src/views/Approvals.jsx', import.meta.url), 'utf8');
  const alerts = readFileSync(new URL('../src/views/Governance.jsx', import.meta.url), 'utf8');
  const placement = readFileSync(new URL('../src/views/Placement.jsx', import.meta.url), 'utf8');
  assert.match(approvals, /isCoordinator && <>[\s\S]*?SummaryMetrics className="approvals-summary" ariaLabel="Submission summary" items=\{\[/);
  assert.match(alerts, /SummaryMetrics className="alert-summary" ariaLabel="Alert status summary"/);
  assert.match(placement, /SummaryMetrics className="placement-review-summary" ariaLabel="Placement summary"/);
  assert.match(readFileSync(new URL('../src/views/approvals.css', import.meta.url), 'utf8'), /@media \(min-width: 640px\).*approvals-summary \{ grid-template-columns: repeat\(3/);
});

test('approvals screen supports initialQuery deep linking to auto-select and open review modal', () => {
  const source = readFileSync(new URL('../src/views/Approvals.jsx', import.meta.url), 'utf8');
  assert.match(source, /export function Approvals\(\{ user, db, onChange, initialQuery \}\)/);
  assert.match(source, /initialQuery\?\.category/);
  assert.match(source, /setSelected\(match\)/);
});

