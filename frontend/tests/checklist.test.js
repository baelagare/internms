import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checklistPage,
  checklistSummary,
  documentAccept,
  documentStatus,
  validateDocumentFile
} from '../src/services/studentChecklist.js';

test('validateDocumentFile accepts approved file formats and rejects unsupported types', () => {
  assert.equal(documentAccept, '.pdf,.png,.jpg,.jpeg');
  assert.equal(validateDocumentFile({ name: 'medical_clearance.pdf' }), '');
  assert.equal(validateDocumentFile({ name: 'waiver_scan.PNG' }), '');
  assert.equal(validateDocumentFile({ name: 'insurance_policy.jpg' }), '');
  assert.equal(validateDocumentFile({ name: 'endorsement.jpeg' }), '');

  assert.ok(validateDocumentFile(null));
  assert.ok(validateDocumentFile({ name: 'executable.exe' }));
  assert.ok(validateDocumentFile({ name: 'document.docx' }));
  assert.ok(validateDocumentFile({ name: 'script.js' }));
});

test('documentStatus assigns accurate workflow status labels, tones and attention flags', () => {
  const verified = documentStatus({ status: 'Verified', fileName: 'doc.pdf' });
  assert.equal(verified.tone, 'success');
  assert.equal(verified.attention, false);

  const returned = documentStatus({ status: 'Returned for Revision', fileName: 'doc.pdf' });
  assert.equal(returned.tone, 'danger');
  assert.equal(returned.attention, true);

  const rejected = documentStatus({ status: 'Rejected', fileName: 'doc.pdf' });
  assert.equal(rejected.tone, 'danger');
  assert.equal(rejected.attention, true);

  const pending = documentStatus({ status: 'Pending Verification', fileName: 'doc.pdf' });
  assert.equal(pending.tone, 'warning');
  assert.equal(pending.attention, false);

  const notUploaded = documentStatus({ status: 'Not Uploaded' });
  assert.equal(notUploaded.tone, 'neutral');
  assert.equal(notUploaded.attention, false);

  const empty = documentStatus(null);
  assert.equal(empty.label, 'Not recorded');
  assert.equal(empty.tone, 'neutral');
});

test('checklistSummary accurately calculates counts, progress percentage and attention indicators', () => {
  const user = {
    preDeploymentDocs: [
      { id: 'd1', status: 'Verified', fileName: 'f1.pdf' },
      { id: 'd2', status: 'Verified', fileName: 'f2.pdf' },
      { id: 'd3', status: 'Pending Verification', fileName: 'f3.pdf' },
      { id: 'd4', status: 'Returned for Revision', fileName: 'f4.pdf' },
      { id: 'd5', status: 'Not Uploaded', fileName: null }
    ]
  };

  const summary = checklistSummary(user);
  assert.equal(summary.total, 5);
  assert.equal(summary.verified, 2);
  assert.equal(summary.remaining, 3);
  assert.equal(summary.attention, 1);
  assert.equal(summary.missing, 1);
  assert.equal(summary.pending, 1);
  assert.equal(summary.percent, 40); // 2/5 = 40%
});

test('checklistSummary handles empty or missing document collections safely', () => {
  const empty = checklistSummary({});
  assert.equal(empty.total, 0);
  assert.equal(empty.verified, 0);
  assert.equal(empty.remaining, 0);
  assert.equal(empty.percent, 0);
});

test('checklistPage filters documents by search query, status, and paginates correctly', () => {
  const docs = [
    { id: '1', code: 'DOC-01', title: 'Medical Clearance', issuer: 'Infirmary', status: 'Verified' },
    { id: '2', code: 'DOC-02', title: 'Parent Consent Waiver', issuer: 'Notary', status: 'Not Uploaded' },
    { id: '3', code: 'DOC-03', title: 'Insurance Policy', issuer: 'Cashier', status: 'Returned for Revision' }
  ];

  // Search by code
  const codeResult = checklistPage(docs, 'DOC-02');
  assert.equal(codeResult.count, 1);
  assert.equal(codeResult.rows[0].code, 'DOC-02');

  // Search by title
  const titleResult = checklistPage(docs, 'clearance');
  assert.equal(titleResult.count, 1);
  assert.equal(titleResult.rows[0].id, '1');

  // Filter by status
  const statusResult = checklistPage(docs, '', 'Returned for Revision');
  assert.equal(statusResult.count, 1);
  assert.equal(statusResult.rows[0].code, 'DOC-03');

  // Pagination bounds
  const pageResult = checklistPage(docs, '', '', 1);
  assert.equal(pageResult.pages, 1);
  assert.equal(pageResult.current, 1);
  assert.equal(pageResult.rows.length, 3);
});
