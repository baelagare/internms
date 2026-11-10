import { useEffect, useId, useRef, useState } from 'react';
import { Button, Card, EmptyState, PageHeader } from './ui.jsx';
import { Icon } from './Icons.jsx';

export function Field({
  label,
  options,
  multiline = false,
  hint,
  error,
  required,
  inputRef,
  className = '',
  ...props
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const baseClasses = `min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-navy-700 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 ${
    error ? 'border-red-500 bg-red-50/30' : 'border-slate-300 bg-white'
  }`;
  const commonProps = {
    id,
    required,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
    className: baseClasses,
    ...props
  };

  return (
    <div className={`block ${className}`}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-slate-800">
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-red-600">
              *
            </span>
          )}
        </label>
      )}
      {options ? (
        <select ref={inputRef} {...commonProps}>
          {options.map(option => {
            const val = option?.value ?? option;
            const lbl = option?.label ?? option;
            return (
              <option key={String(val)} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
      ) : multiline ? (
        <textarea ref={inputRef} rows={props.rows || 4} {...commonProps} />
      ) : (
        <input ref={inputRef} {...commonProps} />
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function SearchField({ label = 'Search', value, onChange, onClear, placeholder = 'Search…', inputRef }) {
  const id = useId();
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <Icon name="search" size={16} className="pointer-events-none absolute left-3 text-slate-400" />
        <input
          ref={inputRef}
          id={id}
          type="search"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <Icon name="close" size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  const ref = useRef();
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      className="max-h-[90vh] w-[min(44rem,95vw)] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-modal backdrop:bg-slate-950/50"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <h2 id={id} className="text-lg font-bold text-navy-950">
          {title}
        </h2>
        <Button variant="quiet" size="sm" onClick={onClose} aria-label="Close dialog">
          <Icon name="close" size={18} />
        </Button>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </dialog>
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
    <div
      role={feedback.error ? 'alert' : 'status'}
      className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${
        feedback.error
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      }`}
    >
      <span>{feedback.message}</span>
      <button
        type="button"
        onClick={() => setFeedback(null)}
        aria-label="Dismiss message"
        className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-md opacity-70 hover:opacity-100"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
  return { run, busy, notice, clearNotice: () => setFeedback(null) };
}

export function DataTable({ title, columns, rows, search = true }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const filtered = rows.filter(
    row => !query || JSON.stringify(row).toLowerCase().includes(query.toLowerCase())
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages);
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-lg font-bold text-slate-900">{title}</h2>
      {search && rows.length > 5 && (
        <SearchField
          label={`Search ${title.toLowerCase()}`}
          value={query}
          onChange={event => {
            setQuery(event.target.value);
            setPage(1);
          }}
          onClear={() => {
            setQuery('');
            setPage(1);
          }}
        />
      )}
      <div className="mt-4 overflow-x-auto" role="region" aria-label={title} tabIndex={0}>
        {filtered.length ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {columns.map(column => (
                  <th
                    key={column.key}
                    scope="col"
                    className="border-b border-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice((current - 1) * 10, current * 10).map((row, index) => (
                <tr key={row.id ?? index} className="border-b border-slate-100 last:border-0">
                  {columns.map(column => (
                    <td key={column.key} className="px-3 py-3 align-top text-slate-800">
                      {column.render ? column.render(row) : row[column.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No matching records"
            description={query ? 'Try a different search.' : 'Records will appear here when created.'}
          />
        )}
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button variant="secondary" disabled={current === 1} onClick={() => setPage(current - 1)}>
            Previous
          </Button>
          <span className="text-sm text-slate-600" aria-live="polite">
            Page {current} of {pages} · {filtered.length} records
          </span>
          <Button
            variant="secondary"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </Card>
  );
}
