import { useId, useRef, useState } from 'react';
import { Button, Notice, PageHeader } from './foundation/primitives.jsx';
import { DataTable, Modal, Pagination, SearchField } from './foundation/records.jsx';

export { DataTable, Modal, Pagination, SearchField };
export { Input, Select, Checkbox, FileInput } from './foundation/forms.jsx';


export function Field({
  label,
  options,
  multiline = false,
  rows = 4,
  hint,
  error,
  required,
  inputRef,
  className = '',
  id: explicitId,
  children,
  ...props
}) {
  const generatedId = useId();
  const id = explicitId || generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const controlProps = {
    id,
    ref: inputRef,
    required,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
    className: `ds-control ${error ? 'ds-control--error' : ''}`,
    ...props
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-ink">
          {label}
          {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      {children
        ? (typeof children === 'function' ? children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, required }) : children)
        : options ? (
          <select {...controlProps}>
            {options.map(option => {
              const val = option?.value ?? option;
              const lbl = option?.label ?? option;
              return <option key={String(val)} value={val}>{lbl}</option>;
            })}
          </select>
        ) : multiline ? (
          <textarea {...controlProps} rows={rows} />
        ) : (
          <input {...controlProps} />
        )}
      {hint && !error && <p id={hintId} className="text-xs text-muted">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}




export function WorkspacePage({ title, subtitle, action, children }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} action={action} />
      {children}
    </div>
  );
}

export function useMutation(onChange) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const lock = useRef(false);
  async function run(operation, message = 'Saved.') {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const next = await operation();
      onChange(next);
      setFeedback({ message, error: false });
      return true;
    } catch (error) {
      setFeedback({ message: error.message, error: true });
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const notice = feedback && (
    <Notice
      tone={feedback.error ? 'danger' : 'success'}
      onDismiss={() => setFeedback(null)}
    >
      <span>{feedback.message}</span>
    </Notice>
  );

  return { run, busy, notice, clearNotice: () => setFeedback(null) };
}

