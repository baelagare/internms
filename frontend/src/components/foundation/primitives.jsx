import { useId, useState } from 'react';
import { Icon } from '../Icons.jsx';

export function Button({ children, variant = 'primary', size = 'md', loading = false, loadingLabel = 'Working…', disabled = false, type = 'button', className = '', ...props }) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
    className={`ds-button ds-button--${variant} ds-button--${size} ${className}`}>
    {loading ? <><span className="ds-spinner" aria-hidden="true" />{loadingLabel}</> : children}
  </button>;
}

export function IconButton({ label, icon, ...props }) {
  return <Button {...props} aria-label={label} className={`ds-icon-button ${props.className || ''}`}><Icon name={icon} /></Button>;
}

export function Card({ as: Component = 'section', children, className = '', ...props }) {
  return <Component {...props} className={`ds-panel ${className}`}>{children}</Component>;
}

export function PageHeader({ title, subtitle, description, badge, action }) {
  return <header className="ds-page-header"><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h1>{title}</h1>{badge}</div>
    {(subtitle ?? description) && <p className="mt-2 text-sm text-muted">{subtitle ?? description}</p>}</div>
    {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
  </header>;
}

export function SectionHeading({ title, description, action, id, eyebrow }) {
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-4"><div>
    {eyebrow && <p className="mb-1 text-sm text-muted">{eyebrow}</p>}
    <h2 id={id} className="text-xl font-semibold text-ink">{title}</h2>
    {description && <p className="mt-1 text-sm text-muted">{description}</p>}</div>{action}</div>;
}

export function Skeleton({ className = '', lines = 1, label = 'Loading' }) {
  return <div role="status" aria-busy="true" className={`space-y-3 ${className}`}><span className="sr-only">{label}</span>
    {Array.from({ length: Math.max(1, Math.min(10, lines)) }, (_, i) => <div key={i} aria-hidden="true" className="ds-skeleton h-4 rounded-control" />)}
  </div>;
}

export function Notice({ tone = 'info', title, children, onDismiss, action }) {
  return <div role={tone === 'danger' || tone === 'error' ? 'alert' : 'status'} className={`ds-notice ds-tone--${tone}`}>
    <div className="min-w-0 flex-1">{title && <p className="font-semibold">{title}</p>}{children && <div className={title ? 'mt-1' : ''}>{children}</div>}{action && <div className="mt-3">{action}</div>}</div>
    {onDismiss && <IconButton label="Dismiss message" icon="close" variant="quiet" onClick={onDismiss} />}
  </div>;
}

export function Toast({ title, children, tone = 'info', onDismiss, action }) {
  return <div className="ds-toast"><Notice title={title} tone={tone} onDismiss={onDismiss} action={action}>{children}</Notice></div>;
}

export function EmptyState({ title = 'No records', description, action, icon = 'inbox' }) {
  return <div className="ds-empty"><Icon name={icon} size={24} className="mb-3 text-muted" /><h3 className="font-semibold text-ink">{title}</h3>
    {description && <p className="mx-auto mt-1 max-w-prose text-sm text-muted">{description}</p>}{action && <div className="mt-4">{action}</div>}
  </div>;
}

export function DataState({ loading, error, unavailable, empty, onRetry, emptyTitle, emptyDescription, children }) {
  if (loading) return <Skeleton lines={3} label="Loading records" />;
  if (error) return <Notice tone="danger" title="Records could not be loaded" action={onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}>{error}</Notice>;
  if (unavailable) return <EmptyState title="Records unavailable" description={typeof unavailable === 'string' ? unavailable : 'The data service is not connected.'} />;
  if (empty) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return children;
}

export function ProgressBar({ value, max = 100, label = 'Progress' }) {
  const known = typeof value === 'number' && Number.isFinite(value) && typeof max === 'number' && Number.isFinite(max) && max > 0;
  if (!known) return <p className="text-sm text-muted" role="status">{label}: unavailable</p>;
  const safe = Math.min(max, Math.max(0, value));
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={safe} className="h-2 w-full overflow-hidden rounded-full bg-subtle">
    <div className="h-full rounded-full bg-accent" style={{ width: `${safe / max * 100}%` }} />
  </div>;
}

export function HelpTip({ label = 'How this works', children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div><Button variant="quiet" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><Icon name="help" />{label}</Button>
    <div id={id} hidden={!open} className="mt-2 rounded-panel border border-line bg-subtle p-4 text-sm text-muted">{children}</div></div>;
}

export function Metric({ label, value, detail, badge }) {
  return <div className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted">{label}</p>{badge}</div>
    <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value ?? '—'}</p>{detail && <p className="mt-1 text-xs text-muted">{detail}</p>}</div>;
}

// Single source of truth for "rows of metric cards" used across page summaries and dashboard KPI grids.
// `items` is an array of { label, value, detail? }; `className` carries a page-specific hook for responsive
// column overrides; `accent` (optional) adds a semantic left-border to the first card.
export function SummaryMetrics({ items = [], className = '', ariaLabel = 'Summary', accent = null, as = 'section' }) {
  const Component = as;
  const cards = Array.isArray(items) ? items : [];
  return <Component className={`ds-metrics ${className}`.trim()} aria-label={ariaLabel}>
    {cards.map((item, index) => {
      const cardClassName = `ds-metrics-card ${accent && index === 0 ? `ds-metrics-card--accent-${accent}` : ''}`.trim();
      // `node` is a full card-body slot (e.g. a rich "lead" KPI containing a progress bar);
      // otherwise the standard label(+badge)/value/detail layout is rendered.
      return <div key={index} className={cardClassName}>
        {item.node != null ? item.node : <>
          <div className="ds-metrics-head"><span className="ds-metrics-label">{item.label}</span>{item.badge != null && item.badge}</div>
          <strong className="ds-metrics-value">{item.value}</strong>
          {item.detail != null && item.detail !== '' && <p className="ds-metrics-detail">{item.detail}</p>}
        </>}
      </div>;
    })}
  </Component>;
}
