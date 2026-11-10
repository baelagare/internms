import { useId, useRef, useState } from 'react';
import { Button, StatusBadge } from '../components/ui.jsx';
import { Icon } from '../components/Icons.jsx';
import { documentAccept, documentStatus, validateDocumentFile } from '../services/studentChecklist.js';
import { formatProfileDate } from '../services/studentProfile.js';

export function DocumentUpload({ document, busy, notice, onCancel, onSubmit }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const input = useRef(null);
  const id = useId();
  const replacing = Boolean(document.fileName);

  function selectFile(event) {
    const next = event.target.files?.[0];
    if (!next) return;
    const message = validateDocumentFile(next);
    setError(message);
    setFile(message ? null : next);
    event.target.value = '';
  }

  return (
    <form
      className="space-y-4"
      aria-busy={busy}
      onSubmit={event => {
        event.preventDefault();
        if (!file) {
          setError('Select a document before saving.');
          return;
        }
        onSubmit(file);
      }}
    >
      <div>
        <h3 className="text-base font-bold text-slate-900">{document.title}</h3>
        {replacing && (
          <p className="mt-1 text-xs text-slate-600">
            Current file: <strong>{document.fileName}</strong>
          </p>
        )}
      </div>

      <p className="text-xs text-slate-600">
        {replacing
          ? 'Uploading a new file sends this requirement back to your coordinator for review.'
          : 'Your coordinator will review this document once uploaded.'}
      </p>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <input
          ref={input}
          id={`${id}-file`}
          type="file"
          hidden
          accept={documentAccept}
          aria-label={`Choose document for ${document.code}`}
          onChange={selectFile}
          disabled={busy}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => input.current?.click()}
            aria-describedby={`${id}-restrictions${error ? ` ${id}-error` : ''}`}
          >
            <Icon name="file" size={16} />
            {file ? 'Choose another file' : 'Choose file'}
          </Button>
          <p id={`${id}-restrictions`} className="text-xs text-slate-500">
            PDF, PNG, or JPG
          </p>
        </div>

        {error && (
          <p id={`${id}-error`} className="text-xs font-semibold text-red-700" role="alert">
            {error}
          </p>
        )}

        <div role="status" className="text-xs text-slate-700">
          {file ? (
            <span>
              Selected: <strong>{file.name}</strong> ({Math.max(1, Math.round(file.size / 1024))} KB)
            </span>
          ) : (
            <span>No file selected.</span>
          )}
        </div>
      </div>

      {notice}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || !file}>
          {busy
            ? 'Saving…'
            : replacing
            ? 'Save replacement metadata'
            : 'Save document metadata'}
        </Button>
      </div>
    </form>
  );
}

export function DocumentRecord({ document, user }) {
  const { label, tone } = documentStatus(document);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">{document.title}</h3>
          <p className="text-xs text-slate-500">{document.code}</p>
        </div>
        <StatusBadge status={label} tone={tone} plain />
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {[
          ['Issued by', document.issuer || 'Not recorded'],
          ['File', document.fileName || 'No file uploaded'],
          [
            'Submitted',
            document.uploadedAt ? formatProfileDate(document.uploadedAt) : 'Not recorded'
          ],
          ['File size', document.fileSize || 'Not recorded'],
          ['Reviewed by', document.verifiedBy || 'Waiting for review'],
          ['Student', `${user.name}${user.studentNumber ? ` · ${user.studentNumber}` : ''}`]
        ].map(([itemLabel, value]) => (
          <div key={itemLabel} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {itemLabel}
            </dt>
            <dd className="mt-1 font-semibold text-slate-900 break-words">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Coordinator remarks
        </h4>
        <p className="mt-1 text-slate-800">{document.remarks || 'No remarks recorded.'}</p>
      </section>

      <p className="text-xs text-slate-500">
        Document contents unavailable in demo mode (file details only).
      </p>
    </div>
  );
}
