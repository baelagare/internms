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
        <h3 className="text-base font-semibold text-ink">{document.title}</h3>
        <p className="text-xs text-muted">{document.code}</p>
        {replacing && (
          <p className="mt-1 text-xs text-muted">
            Current file record: <strong className="text-ink">{document.fileName}</strong>
          </p>
        )}
      </div>

      <p className="text-xs text-muted">
        {replacing
          ? 'Uploading a replacement document submits this requirement for coordinator review.'
          : 'Your OJT coordinator will review this document once uploaded.'}
      </p>


      <div className="space-y-3 rounded-panel border border-line bg-subtle p-4">
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
            {file ? 'Choose another file' : 'Choose document file'}
          </Button>
          <p id={`${id}-restrictions`} className="text-xs text-muted">
            Accepted: PDF, PNG, or JPG
          </p>
        </div>

        {error && (
          <p id={`${id}-error`} className="text-xs font-semibold text-danger" role="alert">
            {error}
          </p>
        )}

        <div role="status" className="text-xs text-ink font-medium">
          {file ? (
            <span>
              Selected: <strong>{file.name}</strong> ({Math.max(1, Math.round(file.size / 1024))} KB)
            </span>
          ) : (
            <span className="text-muted">No file selected.</span>
          )}
        </div>
      </div>

      {notice}

      <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-line">
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={busy || !file}>
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

export function DocumentRecord({ document, user = {} }) {
  const { label, tone } = documentStatus(document);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h3 className="text-base font-semibold text-ink">{document.title}</h3>
          <p className="text-xs text-muted">{document.code}</p>
        </div>
        <StatusBadge status={label} tone={tone} />
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {[
          ['Document code', document.code || 'Not recorded'],
          ['Issuing authority', document.issuer || 'Not recorded'],
          ['File record', document.fileName || 'No file uploaded'],
          [
            'Submission date',
            document.uploadedAt ? formatProfileDate(document.uploadedAt) : 'Not recorded'
          ],
          ['Recorded size', document.fileSize || 'Not recorded'],
          ['Reviewed by', document.verifiedBy || 'Waiting for coordinator review'],
          ['Student', `${user.name || 'Student'}${user.studentNumber ? ` · ${user.studentNumber}` : ''}`]
        ].map(([itemLabel, value]) => (
          <div key={itemLabel} className="rounded-panel border border-line bg-subtle p-3.5">
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
              {itemLabel}
            </dt>
            <dd className="mt-1 font-semibold text-ink break-words">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="rounded-panel border border-line bg-subtle p-3.5 text-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Coordinator review remarks
        </h4>
        <p className="mt-1 text-ink leading-relaxed">
          {document.remarks || 'No remarks recorded for this requirement.'}
        </p>
      </section>

      <p className="text-xs text-muted">
        Document metadata view. Original file contents are not stored in browser session.
      </p>
    </div>
  );
}

