import { dashboardSummary } from './studentDashboard.js';

// Shared with the metadata-saving service; no size cap exists in that contract.
export const documentAccept = '.pdf,.png,.jpg,.jpeg';
export function validateDocumentFile(file) {
  return !file || !/\.(pdf|png|jpe?g)$/i.test(file.name) ? 'Choose a PDF, PNG, or JPEG document.' : '';
}

export function documentStatus(document) {
  const label = document.status || (document.fileName ? 'Status unavailable' : 'Not Uploaded');
  const tone = ({ Verified: 'success', Submitted: 'blue', 'Pending Verification': 'warning', 'Returned for Revision': 'warning', Rejected: 'danger', 'Requires Resubmission': 'warning' })[label] || 'neutral';
  return { label, tone, attention: ['Returned for Revision', 'Rejected', 'Requires Resubmission'].includes(label) };
}

export function checklistSummary(user) {
  const documents = Array.isArray(user.preDeploymentDocs) ? user.preDeploymentDocs : [];
  // Keep the dashboard's exact verification criterion and denominator.
  const { verified, required } = dashboardSummary(user, {});
  const remaining = documents.filter(item => item.status !== 'Verified');
  const attention = remaining.filter(item => documentStatus(item).attention).length;
  const missing = remaining.filter(item => !documentStatus(item).attention && !item.fileName).length;
  const pending = remaining.filter(item => !documentStatus(item).attention && item.fileName && ['Submitted', 'Pending Verification'].includes(item.status)).length;
  return { total: required ?? 0, verified, remaining: remaining.length, attention, missing, pending, other: remaining.length - attention - missing - pending, percent: required ? Math.round(verified / required * 100) : 0 };
}

export function checklistPage(documents, query = '', status = '', page = 1) {
  // Preserve the former DataTable's case-insensitive, all-record-fields search.
  const filtered = documents.filter(item => (!query || JSON.stringify(item).toLowerCase().includes(query.toLowerCase())) && (!status || documentStatus(item).label === status));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.max(1, Math.min(page, pages));
  return { rows: filtered.slice((current - 1) * 10, current * 10), count: filtered.length, pages, current };
}