import { useEffect, useId } from 'react';

export function ProfileField({
  label,
  hint,
  error,
  multiline,
  options,
  required,
  inputRef,
  ...props
}) {
  const id = useId();
  const isReadOnly = Boolean(props.readOnly);
  const attributes = {
    id,
    required,
    'aria-invalid': Boolean(error),
    'aria-describedby':
      [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined,
    className: `min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-navy-700 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 ${
      error
        ? 'border-red-500 bg-red-50/30 text-slate-900'
        : isReadOnly
        ? 'border-slate-200 bg-slate-100 text-slate-700'
        : 'border-slate-300 bg-white text-slate-900'
    } ${
      props.type === 'file'
        ? 'file:mr-3 file:min-h-[32px] file:cursor-pointer file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-3 file:py-1 file:text-xs file:font-bold file:text-navy-900 hover:file:bg-slate-100'
        : ''
    }`,
    ...props
  };

  return (
    <div className="block space-y-1.5">
      <label htmlFor={id} className="block text-sm font-bold text-slate-800">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-red-600">
            *
          </span>
        )}
      </label>
      {options ? (
        <select {...attributes}>
          {options.map(option => (
            <option key={option} value={option}>
              {option || 'Select standing'}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea rows={4} {...attributes} />
      ) : (
        <input ref={inputRef} {...attributes} />
      )}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function focusInvalid(form) {
  requestAnimationFrame(() => form?.querySelector('[aria-invalid="true"]')?.focus());
}

export function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return;
    const warn = event => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}

export function ProfileHeading({ id, title, description, count, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h2 id={id} className="text-lg font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          {count != null && (
            <span
              aria-label={`${count} entries`}
              className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-bold text-navy-900"
            >
              {count}
            </span>
          )}
        </div>
        {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}
