import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checklistSummary, checklistPage, documentStatus, validateDocumentFile } from '../src-react/services/studentChecklist.js';
import { dashboardSummary } from '../src-react/services/studentDashboard.js';
import { reviewTraining } from '../src-react/services/training.js';

test('checklist counts match dashboard for every existing student without changing records', () => {
  const db = JSON.parse(readFileSync(new URL('../database.json', import.meta.url)));
  const before = JSON.stringify(db);
  for (const user of db.users.filter(user => user.role === 'student')) {
    const summary = checklistSummary(user), dashboard = dashboardSummary(user, db);
    assert.equal(summary.verified, dashboard.verified);
    assert.equal(summary.total, dashboard.required);
    assert.equal(summary.remaining + summary.verified, summary.total);
    assert.equal(summary.missing + summary.pending + summary.attention + summary.other, summary.remaining);
  }
  assert.equal(JSON.stringify(db), before);
});

test('summary separates uploads, missing files, revisions, rejected and unknown statuses', () => {
  const documents = [
    { status: 'Verified', fileName: 'a.pdf' },
    { status: 'Pending Verification', fileName: 'b.pdf' },
    { status: 'Submitted', fileName: 'c.pdf' },
    { status: 'Not Uploaded' },
    { status: 'Returned for Revision', fileName: 'd.pdf' },
    { status: 'Rejected', fileName: 'e.pdf' },
    { status: 'Unrecognized', fileName: 'f.pdf' }
  ];
  assert.deepEqual(checklistSummary({ preDeploymentDocs: documents }), { total: 7, verified: 1, remaining: 6, missing: 1, pending: 2, attention: 2, other: 1, percent: 14 });
  for (const preDeploymentDocs of [[], null, undefined]) {
    const result = checklistSummary({ preDeploymentDocs });
    assert.equal(result.total, 0); assert.equal(result.percent, 0); assert.equal(result.verified, 0);
  }
});

test('status presentation preserves recorded text and never assumes unknown uploads are verified', () => {
  assert.deepEqual(documentStatus({ status: 'Returned for Revision' }), { label: 'Returned for Revision', tone: 'warning', attention: true });
  assert.equal(documentStatus({ status: 'Rejected' }).tone, 'danger');
  assert.equal(documentStatus({ status: 'Verified' }).tone, 'success');
  assert.equal(documentStatus({ fileName: 'x.pdf' }).label, 'Status unavailable');
  assert.equal(documentStatus({}).label, 'Not Uploaded');
});

test('search preserves all-fields semantics, combines status, clamps pages and leaves data untouched', () => {
  const documents = Array.from({ length: 23 }, (_, index) => ({ id: index, code: `DOC-${index}`, issuer: 'University infirmary', remarks: index === 20 ? 'Special instruction' : '', status: index < 11 ? 'Verified' : 'Pending Verification' }));
  const before = JSON.stringify(documents);
  assert.equal(checklistPage(documents).pages, 3);
  assert.equal(checklistPage(documents, '', '', 99).current, 3);
  assert.equal(checklistPage(documents, '', '', -1).current, 1);
  assert.equal(checklistPage(documents, '', '', 3).rows.length, 3);
  assert.equal(checklistPage(documents, 'INFIRMARY', 'Verified').count, 11);
  assert.equal(checklistPage(documents, 'Special instruction').rows[0].id, 20);
  assert.equal(checklistPage(documents, 'Special instruction', 'Verified').count, 0);
  assert.equal(checklistPage(documents, 'nothing', '', 3).current, 1);
  assert.equal(JSON.stringify(documents), before);
});

test('file validation preserves formats and does not invent a size limit or trust MIME alone', () => {
  for (const name of ['a.pdf', 'a.PNG', 'a.jpg', 'a.JPEG']) assert.equal(validateDocumentFile({ name, size: 1024 * 1024 * 100 }), '');
  for (const name of ['a.pdf.exe', 'a.docx', 'a', '']) assert.ok(validateDocumentFile({ name, type: 'application/pdf' }));
  assert.ok(validateDocumentFile(null));
});

test('student cannot approve own document; coordinator review remains scoped', () => {
  const student = { id: 's', role: 'student', college: 'CITE', preDeploymentDocs: [{ id: 'd', status: 'Pending Verification', fileName: 'a.pdf' }] };
  const db = { users: [student] };
  assert.throws(() => reviewTraining(db, student, 'document', 'd', 's', true), /Review requires/);
  assert.throws(() => reviewTraining(db, { role: 'coordinator', college: 'OTHER' }, 'document', 'd', 's', true), /authorized scope/);
  assert.equal(student.preDeploymentDocs[0].status, 'Pending Verification');
});