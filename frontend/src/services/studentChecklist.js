import { dashboardSummary } from './studentDashboard.js';
import { resolveStatus } from '../components/foundation/status.js';

export const documentAccept = '.pdf,.png,.jpg,.jpeg';

export function validateDocumentFile(file) {
  return !file || !/\.(pdf|png|jpe?g)$/i.test(file.name)
    ? 'Choose a PDF, PNG, or JPEG document.'
    : '';
}

export function documentStatus(document) {
  if (!document) return { label: 'Not recorded', tone: 'neutral', attention: false };
  const raw = document.status || (document.fileName ? 'Status unavailable' : 'Not Uploaded');
  const resolved = resolveStatus(raw);
  const attention = ['Returned for Revision', 'Rejected', 'Requires Resubmission'].includes(raw);
  return {
    label: raw,
    displayLabel: resolved.label,
    tone: resolved.tone,
    attention
  };
}

export function checklistSummary(user = {}) {
  const documents = Array.isArray(user.preDeploymentDocs) ? user.preDeploymentDocs : [];
  const { verified, required } = dashboardSummary(user, {});
  const remaining = documents.filter(item => item.status !== 'Verified');
  const attention = remaining.filter(item => documentStatus(item).attention).length;
  const missing = remaining.filter(item => !documentStatus(item).attention && !item.fileName).length;
  const pending = remaining.filter(
    item => !documentStatus(item).attention && item.fileName && ['Submitted', 'Pending Verification'].includes(item.status)
  ).length;

  return {
    total: required ?? 0,
    verified: verified ?? 0,
    remaining: remaining.length,
    attention,
    missing,
    pending,
    other: remaining.length - attention - missing - pending,
    percent: required ? Math.round(((verified ?? 0) / required) * 100) : 0
  };
}

export function checklistPage(documents = [], query = '', status = '', page = 1) {
  const filtered = documents.filter(item => {
    const statusMatch = !status || item.status === status || documentStatus(item).label === status;
    const queryMatch =
      !query ||
      item.title?.toLowerCase().includes(query.toLowerCase()) ||
      item.code?.toLowerCase().includes(query.toLowerCase()) ||
      item.issuer?.toLowerCase().includes(query.toLowerCase()) ||
      item.fileName?.toLowerCase().includes(query.toLowerCase());
    return statusMatch && queryMatch;
  });

  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.max(1, Math.min(page, pages));
  return {
    rows: filtered.slice((current - 1) * 10, current * 10),
    count: filtered.length,
    pages,
    current
  };
}
