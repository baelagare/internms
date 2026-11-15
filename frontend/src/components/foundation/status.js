export const STATUS_MAP = {
  'Supervisor Verified': { label: 'Supervisor verified', tone: 'info' },
  'Coordinator Approved': { label: 'Coordinator approved', tone: 'success' },
  'Cleared & Certified': { label: 'Cleared and certified', tone: 'success' },
  'Approved & Deployed': { label: 'Placed and deployed', tone: 'success' },
  Verified: { label: 'Verified', tone: 'success' },
  Approved: { label: 'Approved', tone: 'success' },
  Completed: { label: 'Completed', tone: 'success' },
  Eligible: { label: 'Eligible', tone: 'success' },

  'Pending Supervisor Verification': { label: 'Waiting for supervisor review', tone: 'warning' },
  'Pending Coordinator Endorsement': { label: 'Waiting for coordinator decision', tone: 'warning' },
  'Pending Verification': { label: 'Waiting for review', tone: 'warning' },
  Submitted: { label: 'Submitted', tone: 'info' },
  'In Progress': { label: 'In progress', tone: 'info' },

  'Returned for Revision': { label: 'Returned for changes', tone: 'danger' },
  'Requires Resubmission': { label: 'Resubmission required', tone: 'danger' },
  'Requires Attention': { label: 'Needs attention', tone: 'danger' },
  Rejected: { label: 'Rejected', tone: 'danger' },
  'Requirements Not Met': { label: 'Requirements not met', tone: 'danger' },

  Unplaced: { label: 'Unplaced', tone: 'neutral' },
  'Not Uploaded': { label: 'Not uploaded', tone: 'neutral' },
  Pending: { label: 'Not started', tone: 'neutral' },
  'Pre-Deployment': { label: 'Pre-deployment', tone: 'neutral' },
  'Eligibility Unconfirmed': { label: 'Eligibility unconfirmed', tone: 'neutral' }
};

export function resolveStatus(raw, fallbackTone = 'neutral') {
  if (!raw) return { label: 'Not recorded', tone: fallbackTone };
  const key = String(raw).trim();
  if (STATUS_MAP[key]) return STATUS_MAP[key];
  if (/returned|revision|rejected|attention|not met/i.test(key)) return { label: key, tone: 'danger' };
  if (/pending|waiting/i.test(key)) return { label: key, tone: 'warning' };
  if (/approved|verified|cleared|completed/i.test(key)) return { label: key, tone: 'success' };
  return { label: key, tone: fallbackTone };
}
