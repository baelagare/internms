/** Shared HTML helpers. */
export function esc(str = '') {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function initials(name = '') {
  return String(name)
    .replace(/^(Dr|Prof|Engr|Ms|Mr|For)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
}

/** Short, human-readable labels for audit action codes. */
const ACTION_LABELS = {
  PLACEMENT_HITL_ENDORSEMENT: 'Placement approved',
  PLACEMENT_HITL_OVERRIDE: 'Placement overridden',
  STUDENT_PLACEMENT_PREFERENCE_SUBMITTED: 'Preference submitted',
  PRE_DEPLOYMENT_DOCS_VERIFIED: 'Documents verified',
  PRE_DEPLOYMENT_DOC_VERIFIED: 'Document verified',
  PRE_DEPLOYMENT_DOC_RETURNED: 'Document returned',
  EARLY_WARNING_APPROVED_AND_DISPATCHED: 'Notice sent',
  EARLY_WARNING_EDITED_AND_DISPATCHED: 'Notice edited & sent',
  EARLY_WARNING_DISMISSED_OVERRIDE: 'Alert dismissed',
  FINAL_OJT_CLEARANCE_CERTIFIED: 'Clearance granted',
  COLLEGE_THRESHOLDS_UPDATED: 'Rules updated',
  HTE_EVALUATION_SUBMITTED: 'Evaluation submitted'
};

export function actionLabel(code = '') {
  return ACTION_LABELS[code] || String(code).toLowerCase().replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

export function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value || '');
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(d);
}

export function formatNumber(value, decimals = 0) {
  const num = Number(value);
  if (Number.isNaN(num)) return '0';
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

/**
 * In-place button state confirmation per `ui-animation` ("Confirm in place, not in a corner" + Text state swap).
 */
export function confirmInPlace(btnEl, confirmedHtml = 'Saved', holdMs = 1350) {
  if (!btnEl || btnEl.dataset.confirming === 'true') return;
  const originalHtml = btnEl.innerHTML;
  btnEl.dataset.confirming = 'true';
  btnEl.classList.add('t-text-swap', 'is-exit');

  setTimeout(() => {
    btnEl.innerHTML = confirmedHtml;
    btnEl.classList.remove('is-exit');
    btnEl.classList.add('is-enter-start', 'is-confirmed');
    void btnEl.offsetWidth;
    btnEl.classList.remove('is-enter-start');

    setTimeout(() => {
      btnEl.classList.add('is-exit');
      setTimeout(() => {
        btnEl.innerHTML = originalHtml;
        btnEl.classList.remove('is-exit', 'is-confirmed');
        btnEl.classList.add('is-enter-start');
        void btnEl.offsetWidth;
        btnEl.classList.remove('is-enter-start');
        delete btnEl.dataset.confirming;
      }, 150);
    }, holdMs);
  }, 150);
}

export const LOGOS = {
  seal: './internms-logo.svg',
  mark: './internms-logo.svg'
};
