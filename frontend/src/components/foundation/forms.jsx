import { useId } from 'react';

export function Field({ label, id: explicitId, hint, error, required, children, className = '' }) {
  const generatedId = useId();
  const id = explicitId || generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return <div className={`space-y-1.5 ${className}`}>
    {label && <label htmlFor={id} className="block text-sm font-semibold text-ink">{label}{required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}</label>}
    {typeof children === 'function' ? children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, required }) : children}
    {hint && !error && <p id={hintId} className="text-xs text-muted">{hint}</p>}
    {error && <p id={errorId} role="alert" className="text-xs text-danger">{error}</p>}
  </div>;
}

export function Input({ id, multiline = false, rows = 4, error, hint, className = '', ...props }) {
  const common = {
    id,
    'aria-invalid': Boolean(error),
    className: `ds-control ${error ? 'ds-control--error' : ''} ${className}`,
    ...props
  };
  return multiline ? <textarea {...common} rows={rows} /> : <input {...common} />;
}

export function Select({ id, options = [], error, placeholder = 'Select an option', className = '', ...props }) {
  return <select id={id} aria-invalid={Boolean(error)} className={`ds-control ${error ? 'ds-control--error' : ''} ${className}`} {...props}>
    {placeholder && <option value="" disabled>{placeholder}</option>}
    {options.map(option => {
      const val = option?.value ?? option;
      const lbl = option?.label ?? option;
      return <option key={String(val)} value={val}>{lbl}</option>;
    })}
  </select>;
}

export function Checkbox({ id: explicitId, label, hint, error, className = '', ...props }) {
  const generatedId = useId();
  const id = explicitId || generatedId;
  return <div className={`flex items-start gap-3 ${className}`}><input {...props} type="checkbox" id={id} className="mt-1 h-5 w-5 rounded-control text-accent focus-visible:outline-accent" />
    <div><label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>{hint && <p className="text-xs text-muted">{hint}</p>}{error && <p role="alert" className="text-xs text-danger">{error}</p>}</div>
  </div>;
}

export function FileInput({ id, label = 'Choose file', accept, error, ...props }) {
  return <div className="space-y-2"><input {...props} type="file" id={id} accept={accept} aria-invalid={Boolean(error)} className="ds-control text-sm" />
    {accept && <p className="text-xs text-muted">Accepted formats: {accept}</p>}
  </div>;
}
