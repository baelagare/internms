import { useId, useRef, useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatusBadge
} from '../components/ui.jsx';
import { Icon } from '../components/Icons.jsx';
import { Modal, SearchField, useMutation } from '../components/workflow.jsx';
import { saveStudentFile } from '../services/applicationService.js';
import { checklistPage, checklistSummary, documentStatus } from '../services/studentChecklist.js';
import { formatProfileDate } from '../services/studentProfile.js';
import { DocumentUpload, DocumentRecord } from './StudentChecklistDialogs.jsx';

export function StudentChecklist({ user, onChange }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  const [feedback, setFeedback] = useState('');
  const search = useRef(null);
  const id = useId();

  const available = Array.isArray(user.preDeploymentDocs);
  const documents = available ? user.preDeploymentDocs : [];
  const summary = checklistSummary(user);
  const result = checklistPage(documents, query, status, page);
  const statuses = [...new Set(documents.map(item => documentStatus(item).label))];
  const selected = documents.find(item => item.id === dialog?.id);
  const showFilters = documents.length > 5 || Boolean(query || status);

  function closeDialog() {
    setDialog(null);
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) search.current?.focus();
    });
  }

  function resetFilters() {
    setQuery('');
    setStatus('');
    setPage(1);
    search.current?.focus();
  }

  const nextActionDoc =
    documents.find(item => documentStatus(item).attention) ||
    documents.find(item => !item.fileName);

  return (
    <div className="student-checklist space-y-6">
      <PageHeader
        title="Pre-deployment checklist"
        badge={
          available && documents.length ? (
            <StatusBadge tone={summary.verified === summary.total ? 'success' : 'blue'}>
              {summary.verified} of {summary.total} approved
            </StatusBadge>
          ) : null
        }
        action={
          nextActionDoc ? (
            <Button
              onClick={() => {
                setFeedback('');
                setDialog({ id: nextActionDoc.id, type: 'upload' });
              }}
            >
              <Icon name="file" size={16} />
              {nextActionDoc.fileName ? `Fix ${nextActionDoc.title}` : `Upload ${nextActionDoc.title}`}
            </Button>
          ) : null
        }
      />

      {feedback && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback('')}
            aria-label="Dismiss message"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md opacity-70 hover:opacity-100"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {!available ? (
        <Card className="p-6 space-y-4">
          <div role="alert" className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Document requirements unavailable</h2>
            <p className="text-sm text-slate-600">
              Your checklist records could not be read. Reload the page to try again.
            </p>
          </div>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </Card>
      ) : !documents.length ? (
        <Card className="p-6">
          <EmptyState
            title="No required documents have been assigned yet."
            description="Your required documents will appear here once assigned by your coordinator."
          />
        </Card>
      ) : (
        <>
          {/* Compact Progress Summary */}
          <Card className="p-5 space-y-3" aria-labelledby={`${id}-progress`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id={`${id}-progress`} className="text-base font-bold text-slate-900">
                  {summary.verified} of {summary.total} documents approved
                </h2>
                <p className="text-xs text-slate-600">
                  {summary.remaining === 0
                    ? 'All pre-deployment requirements are approved.'
                    : [
                        summary.attention > 0 && `${summary.attention} need changes`,
                        summary.missing > 0 && `${summary.missing} not uploaded`,
                        summary.pending > 0 && `${summary.pending} waiting for review`
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
              </div>
              <span className="text-lg font-extrabold tabular-nums text-navy-950">
                {summary.percent}%
              </span>
            </div>
            <progress
              className="sr-only"
              value={summary.verified}
              max={summary.total}
              aria-label="Required documents verified"
            >
              {summary.percent}%
            </progress>
            <ProgressBar
              label="Required documents approved"
              value={summary.verified}
              max={summary.total}
            />
          </Card>

          {/* Documents List */}
          <Card className="p-5 space-y-4" aria-labelledby={`${id}-documents`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={`${id}-documents`} className="text-lg font-bold text-slate-900">
                Required documents
              </h2>
              {showFilters && (
                <div className="flex flex-wrap items-end gap-3 w-full sm:w-auto">
                  <div className="min-w-[220px] flex-1">
                    <SearchField
                      inputRef={search}
                      label="Search documents"
                      placeholder="Search by title or office…"
                      value={query}
                      onChange={event => {
                        setQuery(event.target.value);
                        setPage(1);
                      }}
                      onClear={() => {
                        setQuery('');
                        setPage(1);
                        search.current?.focus();
                      }}
                    />
                  </div>
                  <div className="checklist-status-filter min-w-[180px]">
                    <label
                      htmlFor={`${id}-status`}
                      className="mb-1.5 block text-xs font-bold text-slate-700"
                    >
                      Status
                    </label>
                    <select
                      id={`${id}-status`}
                      value={status}
                      onChange={event => {
                        setStatus(event.target.value);
                        setPage(1);
                      }}
                      className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-navy-700 focus:outline-none"
                    >
                      <option value="">All documents</option>
                      {[...new Set([...statuses, ...(status ? [status] : [])])].map(value => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {result.count ? (
              <ul className="divide-y divide-slate-200">
                {result.rows.map(document => (
                  <DocumentItem
                    key={document.id}
                    document={document}
                    onPreview={() => {
                      setFeedback('');
                      setDialog({ id: document.id, type: 'preview' });
                    }}
                    onUpload={() => {
                      setFeedback('');
                      setDialog({ id: document.id, type: 'upload' });
                    }}
                  />
                ))}
              </ul>
            ) : (
              <div className="space-y-3 text-center">
                <EmptyState
                  title="No documents match your search."
                  description="Try another search term or status filter."
                  action={
                    <Button variant="secondary" onClick={resetFilters}>
                      Clear search and filters
                    </Button>
                  }
                />
              </div>
            )}

            {result.pages > 1 && (
              <nav
                className="checklist-pagination flex items-center justify-between gap-3 border-t border-slate-200 pt-4"
                aria-label="Document pages"
              >
                <Button
                  variant="secondary"
                  disabled={result.current === 1}
                  onClick={() => setPage(result.current - 1)}
                >
                  Previous
                </Button>
                <span aria-live="polite" className="text-sm text-slate-600">
                  Page {result.current} of {result.pages}
                </span>
                <Button
                  variant="secondary"
                  disabled={result.current === result.pages}
                  onClick={() => setPage(result.current + 1)}
                >
                  Next
                </Button>
              </nav>
            )}
          </Card>
        </>
      )}

      {selected && dialog.type === 'preview' && (
        <Modal title="Document details" onClose={closeDialog}>
          <DocumentRecord document={selected} user={user} />
        </Modal>
      )}

      {selected && dialog.type === 'upload' && (
        <ChecklistUpload
          user={user}
          document={selected}
          onChange={onChange}
          onClose={closeDialog}
          onSuccess={() => {
            setFeedback(`${selected.title} uploaded and sent for coordinator review.`);
            closeDialog();
          }}
        />
      )}
    </div>
  );
}

function ChecklistUpload({ user, document, onChange, onClose, onSuccess }) {
  const { busy, run, notice } = useMutation(onChange);
  return (
    <Modal
      title={document.fileName ? 'Replace file' : 'Upload document'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <DocumentUpload
        document={document}
        busy={busy}
        notice={notice}
        onCancel={onClose}
        onSubmit={async file => {
          if (await run(() => saveStudentFile(user, document.id, file))) onSuccess();
        }}
      />
    </Modal>
  );
}

function DocumentItem({ document, onPreview, onUpload }) {
  const id = useId();
  const { label, tone, attention } = documentStatus(document);
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <article className="checklist-document space-y-3" aria-labelledby={id}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-lg bg-navy-50 text-navy-900">
              <Icon name="document" size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 id={id} className="text-sm font-bold text-slate-900">
                  {document.title}
                </h3>
                <StatusBadge status={label} tone={tone} plain />
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                {[
                  document.issuer && `Issued by ${document.issuer}`,
                  document.fileName || 'No file uploaded yet',
                  document.uploadedAt && formatProfileDate(document.uploadedAt),
                  document.fileSize
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="quiet"
              size="sm"
              onClick={onPreview}
              aria-label={`Preview Record for ${document.code}`}
            >
              Details
            </Button>
            <Button
              variant={document.fileName && !attention ? 'secondary' : 'primary'}
              size="sm"
              onClick={onUpload}
              aria-label={`${document.fileName ? 'Replace File' : 'Upload Document'} for ${document.code}`}
            >
              {document.fileName ? 'Replace file' : 'Upload file'}
            </Button>
          </div>
        </div>

        {document.remarks ? (
          <details
            className={`checklist-remarks rounded-lg border p-3 text-xs ${
              attention
                ? 'checklist-remarks-attention border-red-200 bg-red-50/50 text-red-900'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
            open={attention ? true : undefined}
            key={`${document.status}-${document.remarks}`}
          >
            <summary className="cursor-pointer font-bold">
              {attention ? 'Changes requested by coordinator' : 'Coordinator note'}
            </summary>
            <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{document.remarks}</p>
          </details>
        ) : (
          attention && (
            <p className="rounded-lg border border-red-200 bg-red-50/50 p-3 text-xs font-semibold text-red-900">
              Changes requested. Contact your coordinator if you are unsure what to update.
            </p>
          )
        )}
      </article>
    </li>
  );
}
