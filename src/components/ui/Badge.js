import { icon } from './Icons.js';
import { esc } from '../../utils/html.js';

const RULES = {
  RULE_A_ATTENDANCE: { label: 'Attendance risk', cls: 'badge-rule-a', icon: 'clock' },
  RULE_B_MISALIGNMENT: { label: 'Task mismatch', cls: 'badge-rule-b', icon: 'briefcase' },
  RULE_C_DOCS: { label: 'Missing documents', cls: 'badge-rule-c', icon: 'fileText' }
};

export function ruleMeta(ruleId) {
  return RULES[ruleId] || { label: 'Alert', cls: 'badge-blue', icon: 'alert' };
}

/** Risk-category badge. Never exposes internal rule IDs. */
export function renderRuleBadge(ruleId) {
  const m = ruleMeta(ruleId);
  return `<span class="badge ${m.cls}">${icon(m.icon, { size: 13 })}${m.label}</span>`;
}

/** Workflow status badge with a single consistent icon per state. */
export function renderStatusBadge(status = '') {
  const raw = String(status || 'Unassigned');
  const s = raw.toLowerCase();
  const short = shortStatus(raw);

  if (/(verified|approved|cleared|passed|complied|eligible|deployed|sent)/.test(s) && !/pending/.test(s)) {
    return `<span class="badge badge-success">${icon('check', { size: 13 })}${esc(short)}</span>`;
  }
  if (/(returned|rejected|hold)/.test(s)) {
    return `<span class="badge badge-rule-a">${icon('undo', { size: 13 })}${esc(short)}</span>`;
  }
  if (/(dismiss|override)/.test(s)) {
    return `<span class="badge badge-neutral">${icon('ban', { size: 13 })}${esc(short)}</span>`;
  }
  if (/(pending|review|progress|awaiting)/.test(s)) {
    return `<span class="badge badge-rule-b">${icon('clock', { size: 13 })}${esc(short)}</span>`;
  }
  if (/not uploaded|unplaced|unassigned/.test(s)) {
    return `<span class="badge badge-neutral">${esc(short)}</span>`;
  }
  return `<span class="badge badge-neutral">${esc(short)}</span>`;
}

/** Condense verbose workflow states into scannable microcopy. */
export function shortStatus(status = '') {
  const map = {
    'Approved & Deployed': 'Deployed',
    'Pending Coordinator Endorsement': 'Awaiting approval',
    'Pending Supervisor Verification': 'Awaiting supervisor',
    'Supervisor Verified': 'Supervisor verified',
    'Coordinator Approved': 'Approved',
    'Pending Verification': 'In review',
    'Returned for Revision': 'Needs revision',
    'Pending Coordinator HITL Review': 'Needs review',
    'Pending Review': 'Needs review',
    'Approved & Dispatched by Coordinator': 'Notice sent',
    'Edited & Dispatched by Coordinator': 'Notice sent',
    'Dismissed / Overridden (False Positive)': 'Dismissed',
    'Dismissed / Overridden': 'Dismissed',
    'Cleared & Certified': 'Cleared',
    'Pending Full Hours Completion': 'In progress',
    'Pending Coordinator Final Clearance': 'Awaiting clearance',
    'Pre-Deployment': 'Pre-deployment',
    Unplaced: 'Not placed'
  };
  return map[status] || status;
}
