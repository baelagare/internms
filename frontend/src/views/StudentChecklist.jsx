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
        title="Pre-deployment Checklist"
        subtitle="Upload and manage required internship clearance documents before deployment."
        badge={
          available && documents.length ? (
            <StatusBadge tone={summary.verified === summary.total ? 'success' : 'info'}>
              {summary.verified} of {summary.total} verified
            </StatusBadge>
          ) : null
        }
        action={
          nextActionDoc ? (
            <Button
              variant="primary"
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
        <Notice tone="success" onDismiss={() => setFeedback('')}>
          <span>{feedback}</span>
        </Notice>
      )}

      {!available ? (
        <Card className="p-6">
          <EmptyState
            title="Document requirements unavailable"
            description="Your checklist records could not be loaded. Please contact your coordinator."
            icon="document"
            action={
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Reload page
              </Button>
            }
          />
        </Card>
      ) : !documents.length ? (
        <Card className="p-6">
          <EmptyState
            title="No required documents assigned"
            description="Your pre-deployment requirements will appear here once configured by your coordinator."
            icon="document"
          />
        </Card>
      ) : (
        <>
          {/* Progress Summary Card */}
          <Card className="p-6 space-y-4" aria-labelledby={`${id}-progress`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id={`${id}-progress`} className="text-lg font-semibold text-ink">
                  {summary.verified} of {summary.total} documents verified
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {summary.remaining === 0
                    ? 'All pre-deployment requirements have been verified.'
                    : [
                        summary.attention > 0 && `${summary.attention} need changes`,
                        summary.missing > 0 && `${summary.missing} not uploaded`,
                        summary.pending > 0 && `${summary.pending} waiting for coordinator review`
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
              </div>
              <span className="text-2xl font-bold tabular-nums text-accent">
                {summary.percent}%
              </span>
            </div>
            <ProgressBar
              label="Pre-deployment requirements verified"
              value={summary.verified}
              max={summary.total}
            />
          </Card>


          {/* Documents List Card */}
          <Card className="p-6 space-y-4" aria-labelledby={`${id}-documents`}>
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-line">
              <h2 id={`${id}-documents`} className="text-lg font-semibold text-ink">
                Required Pre-Deployment Documents
              </h2>
              {showFilters && (
                <div className="flex flex-wrap items-end gap-3 w-full sm:w-auto">
                  <div className="min-w-[220px] flex-1">
                    <SearchField
                      inputRef={search}
                      label="Search requirements"
                      placeholder="Search title, code, or issuer…"
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
                  <div className="min-w-[180px]">
                    <label
                      htmlFor={`${id}-status`}
                      className="block text-sm font-semibold text-ink mb-1.5"
                    >
                      Filter status
                    </label>
                    <select
                      id={`${id}-status`}
                      value={status}
                      onChange={event => {
                        setStatus(event.target.value);
                        setPage(1);
                      }}
                      className="ds-control"
                    >
                      <option value="">All statuses</option>
                      {[...new Set([...statuses, ...(status ? [status] : [])])].map(val => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {result.count ? (
              <ul className="divide-y divide-line">
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
              <EmptyState
                title="No documents match your search"
                description="Try another search term or clear your status filter."
                icon="search"
                action={
                  <Button variant="secondary" onClick={resetFilters}>
                    Clear search and filters
                  </Button>
                }
              />
            )}

            {result.pages > 1 && (
              <nav
                className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
                aria-label="Document pages"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={result.current === 1}
                  onClick={() => setPage(result.current - 1)}
                >
                  Previous page
                </Button>
                <span aria-live="polite" className="text-sm text-muted">
                  Page {result.current} of {result.pages} · {result.count} documents
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={result.current === result.pages}
                  onClick={() => setPage(result.current + 1)}
                >
                  Next page
                </Button>
              </nav>
            )}
          </Card>
        </>
      )}


      {selected && dialog.type === 'preview' && (
        <Modal title="Document Record Details" onClose={closeDialog}>
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
            setFeedback(`${selected.title} metadata saved for coordinator review.`);
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
      title={document.fileName ? 'Replace Document' : 'Upload Document'}
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
      <article className="space-y-3" aria-labelledby={id}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-control bg-accent-subtle text-accent">
              <Icon name="document" size={18} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 id={id} className="text-sm font-semibold text-ink">
                  {document.title}
                </h3>
                <StatusBadge status={label} tone={tone} />
              </div>
              <p className="mt-1 text-xs text-muted">
                {[
                  document.code,
                  document.issuer && `Issuer: ${document.issuer}`,
                  document.fileName || 'No document uploaded yet',
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
              variant="secondary"
              size="sm"
              onClick={onPreview}
              aria-label={`View record details for ${document.code}`}
            >
              Details
            </Button>
            <Button
              variant={document.fileName && !attention ? 'secondary' : 'primary'}
              size="sm"
              onClick={onUpload}
              aria-label={`${document.fileName ? 'Replace file' : 'Upload file'} for ${document.code}`}
            >
              {document.fileName ? 'Replace file' : 'Upload file'}
            </Button>
          </div>
        </div>

        {document.remarks ? (
          <details
            className={`rounded-panel border p-3.5 text-xs ${
              attention
                ? 'border-danger bg-danger-surface text-danger'
                : 'border-line bg-subtle text-ink'
            }`}
            open={attention ? true : undefined}
            key={`${document.status}-${document.remarks}`}
          >
            <summary className="cursor-pointer font-semibold">
              {attention ? 'Coordinator revision instructions' : 'Coordinator review note'}
            </summary>
            <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{document.remarks}</p>
          </details>
        ) : (
          attention && (
            <p className="rounded-panel border border-danger bg-danger-surface p-3 text-xs font-semibold text-danger">
              Changes requested by coordinator. Check revision instructions or re-upload your document.
            </p>
          )
        )}
      </article>
    </li>
  );
}

