import { useEffect, useId } from 'react';
import { Field } from '../components/workflow.jsx';

export function ProfileHeading({ id, title, description, count, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 pb-2 border-b border-line mb-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 id={id} className="text-lg font-semibold text-ink">
            {title}
          </h2>
          {count != null && (
            <span
              aria-label={`${count} items`}
              className="ds-badge ds-tone--neutral"
            >
              {count}
            </span>
          )}
        </div>
        {description && <p className="mt-1 text-xs text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ProfileField({
  label,
  hint,
  error,
  multiline = false,
  options,
  required,
  inputRef,
  id: explicitId,
  readOnly = false,
  className = '',
  ...props
}) {
  const generatedId = useId();
  const id = explicitId || generatedId;

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      options={options}
      multiline={multiline}
      inputRef={inputRef}
      className={className}
      readOnly={readOnly}
      disabled={props.disabled || readOnly}
      {...props}
    />
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

