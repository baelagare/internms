import { useId, useState } from 'react';
import { Icon } from './Icons.jsx';

export const STATUS_PRESENTATION = {
  // Approved / completed
  Verified: { label: 'Approved', tone: 'success' },
  Approved: { label: 'Approved', tone: 'success' },
  'Supervisor Verified': { label: 'Approved', tone: 'success' },
  'Coordinator Approved': { label: 'Approved', tone: 'success' },
  'Cleared & Certified': { label: 'Approved', tone: 'success' },
  Completed: { label: 'Done', tone: 'success' },
  'Approved & Deployed': { label: 'Placed', tone: 'success' },
  Eligible: { label: 'Eligible', tone: 'success' },

  // Pending / in progress
  'Pending Verification': { label: 'Waiting for review', tone: 'warning' },
  'Pending Supervisor Verification': { label: 'Waiting for review', tone: 'warning' },
  'Pending Coordinator Endorsement': { label: 'Waiting for review', tone: 'warning' },
  Submitted: { label: 'Waiting for review', tone: 'warning' },
  Pending: { label: 'Not started', tone: 'neutral' },
  'In Progress': { label: 'In progress', tone: 'blue' },

  // Needs action / rejected
  'Returned for Revision': { label: 'Needs changes', tone: 'danger' },
  'Requires Resubmission': { label: 'Needs changes', tone: 'danger' },
  'Requires Attention': { label: 'Needs changes', tone: 'danger' },
  Rejected: { label: 'Needs changes', tone: 'danger' },
  'Requirements Not Met': { label: 'Not eligible', tone: 'warning' },

  // Neutral / unstarted
  'Not Uploaded': { label: 'Not uploaded', tone: 'neutral' },
  Unplaced: { label: 'Not placed', tone: 'neutral' },
  'Pre-Deployment': { label: 'In progress', tone: 'neutral' },
  'Eligibility Unconfirmed': { label: 'Check details', tone: 'neutral' }
};

export function resolveStatus(rawStatus, fallbackTone = 'neutral') {
  const key = String(rawStatus || '').trim();
  if (STATUS_PRESENTATION[key]) return STATUS_PRESENTATION[key];
  if (/returned|revision|rejected|attention/i.test(key)) return { label: 'Needs changes', tone: 'danger' };
  if (/pending|waiting|submitted/i.test(key)) return { label: 'Waiting for review', tone: 'warning' };
  if (/verified|approved|completed|cleared/i.test(key)) return { label: 'Approved', tone: 'success' };
  return { label: key || 'Not recorded', tone: fallbackTone };
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const styles = {
    primary: 'bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-950 border border-transparent',
    secondary: 'border border-slate-300 bg-white text-slate-800 hover:border-navy-700 hover:bg-slate-50 hover:text-navy-900 active:bg-slate-100',
    quiet: 'border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-navy-900 active:bg-slate-200',
    danger: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-200'
  };
  const sizes = {
    md: 'min-h-[44px] px-4 py-2.5 text-sm',
    sm: 'min-h-[44px] px-3 py-2 text-xs',
    lg: 'min-h-[48px] px-5 py-3 text-base'
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700 disabled:cursor-not-allowed disabled:opacity-55 ${styles[variant] || styles.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatusBadge({ children, status, tone, plain = false }) {
  const mapped = plain ? resolveStatus(status ?? children, tone || 'neutral') : null;
  const resolvedTone = mapped ? mapped.tone : tone || 'neutral';
  const label = mapped ? mapped.label : children;
  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-red-200 bg-red-50 text-red-800',
    blue: 'border-navy-100 bg-navy-50 text-navy-900',
    gold: 'border-amber-200 bg-gold-50 text-gold-800',
    neutral: 'border-slate-200 bg-slate-100 text-slate-700'
  };
  return (
    <span
      style={{ whiteSpace: 'nowrap' }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap ${tones[resolvedTone] || tones.neutral}`}
    >
      {label}
    </span>
  );
}

export function Card({ as: Component = 'section', children, className = '', ...props }) {
  return (
    <Component
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function PageHeader({ title, subtitle, description, badge, action }) {
  const sub = subtitle ?? description;
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-950">{title}</h1>
          {badge}
        </div>
        {sub && <p className="mt-1 text-sm text-slate-600">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}

export function SectionHeading({ eyebrow, title, description, action, id }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gold-800">{eyebrow}</p>
        )}
        <h2 id={id} className="text-lg font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Tabs({ tabs, items, active, activeKey, onChange, ariaLabel = 'View sections' }) {
  const list = tabs || items || [];
  const current = active ?? activeKey;
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200"
    >
      {list.map(tab => {
        const tabId = tab.id ?? tab.key;
        const isSelected = current === tabId;
        return (
          <button
            key={tabId}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(tabId)}
            className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
              isSelected
                ? 'border-navy-900 text-navy-950'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count != null && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  isSelected ? 'bg-navy-50 text-navy-900' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ProgressBar({ value = 0, max = 100, label }) {
  const safeMax = max > 0 ? max : 100;
  const pct = Math.max(0, Math.min(100, Math.round((Number(value || 0) / safeMax) * 100)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.min(safeMax, Math.max(0, Number(value || 0)))}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
    >
      <div className="h-full rounded-full bg-navy-900 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function HelpTip({ label = 'How this works', children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-navy-700 underline-offset-4 hover:underline"
      >
        <Icon name="help" size={15} />
        <span>{label}</span>
      </button>
      {open && (
        <div
          id={id}
          role="note"
          className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action, icon = 'file' }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <Icon name={icon} size={24} className="mx-auto mb-2.5 text-slate-400" />
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Metric({ label, value, detail, badge, tone = 'navy' }) {
  return (
    <div className="border-b border-slate-200 pb-4 last:border-0 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5 sm:last:border-0 sm:last:pr-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        {badge}
      </div>
      <p
        className={`mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums ${
          tone === 'gold' ? 'text-gold-800' : 'text-navy-950'
        }`}
      >
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-slate-600">{detail}</p>}
    </div>
  );
}
