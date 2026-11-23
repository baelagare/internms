import { useMemo, useState } from 'react';
import './alerts.css';
import './audit.css';
import { Button, Card, Notice, SummaryMetrics } from '../components/ui.jsx';
import { DataTable, Field, Modal, WorkspacePage, useMutation } from '../components/workflow.jsx';
import { policyExplanation } from '../services/policyAvailability.js';
import { reviewAlert } from '../services/applicationService.js';
import { collegeCodesForWorkspace, NEMSU_COLLEGES } from '../config/institution.js';

export function Alerts({ user, db, onChange }) {
  const [college, setCollege] = useState('ALL');

  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('ALL');
  const alerts = Array.isArray(db.alerts) ? db.alerts : [];
  const colleges = collegeCodesForWorkspace(db);
  const records = useMemo(() => alerts.filter(item => user.role === 'coordinator' ? item.college === user.college : college === 'ALL' || item.college === college), [alerts, user.role, user.college, college]);
  const pending = records.filter(item => !/dismissed|dispatched/i.test(String(item.hitlStatus || item.status || '')));
  const dismissed = records.filter(item => /dismissed/i.test(String(item.hitlStatus || item.status || '')));
  const dispatched = records.filter(item => /dispatched/i.test(String(item.hitlStatus || item.status || '')));
  const visible = records.filter(item => status === 'ALL' || (status === 'PENDING' ? !/dismissed|dispatched/i.test(String(item.hitlStatus || item.status || '')) : status === 'DISMISSED' ? /dismissed/i.test(String(item.hitlStatus || item.status || '')) : /dispatched/i.test(String(item.hitlStatus || item.status || ''))));
  return <WorkspacePage title={user.role === 'coordinator' ? 'Risk Alerts' : 'Early-Warning Risk Alerts'} subtitle={user.role === 'coordinator' ? 'Review alerts for your college. Alert indicators require human review.' : user.role === 'admin' ? 'Review risk indicators across the university. Human review is required before any action is sent.' : undefined}>
    {(user.role === 'admin' || user.role === 'coordinator') && <>
      <Notice tone="info" title="Early-Warning Risk Detection">Risk indicators identify potential attendance deficits, curriculum non-alignment, and clearance compliance gaps. Coordinator review and confirmation are required before advisories are dispatched to interns.</Notice>
      <SummaryMetrics className="alert-summary" ariaLabel="Alert status summary" accent="warning" items={[
        { label: 'Needs Review', value: pending.length },
        { label: 'Dispatched', value: dispatched.length },
        { label: 'Dismissed', value: dismissed.length }
      ]} />
      {user.role === 'admin' && colleges.length > 0 && <Field label="College Scope" options={[{ value: 'ALL', label: 'All colleges' }, ...colleges.map(code => ({ value: code, label: `${code}${NEMSU_COLLEGES[code]?.name ? ` · ${NEMSU_COLLEGES[code].name}` : ''}` }))]} value={college} onChange={event => setCollege(event.target.value)} />}
      <Field label="Review Status" options={[{ value: 'ALL', label: 'All Alerts' }, { value: 'PENDING', label: 'Needs Review' }, { value: 'DISPATCHED', label: 'Dispatched' }, { value: 'DISMISSED', label: 'Dismissed' }]} value={status} onChange={event => setStatus(event.target.value)} />
    </>}
    <DataTable title={user.role === 'coordinator' ? 'College Alert Records' : 'Risk Alerts'} rows={visible} emptyTitle="No Alerts In This View" emptyDescription="Alerts will appear here when records are available." emptyIcon="alert" columns={[{ key: 'student', label: 'Student' }, { key: 'company', label: 'Host Company' }, { key: 'ruleLabel', label: 'Recorded Category' }, { key: 'triggers', label: 'Recorded Indicators', render: item => (item.triggers || []).join('; ') || 'Not recorded' }, { key: 'hitlStatus', label: 'Review Status', render: item => item.hitlStatus || item.status || 'Not recorded' }, { key: 'actions', label: 'Actions', render: item => <Button variant="secondary" onClick={() => setSelected(item)}>Review Details</Button> }]}/>
    {selected && <Modal title={`Alert Review · ${selected.student || 'Student Record'}`} onClose={() => setSelected(null)}><AlertReview key={selected.id} alert={selected} user={user} db={db} onChange={onChange} onDone={() => setSelected(null)} /></Modal>}
  </WorkspacePage>;
}
const EVIDENCE_KEY_LABELS = {
  consecutive_unexcused_days: 'Consecutive Days Absent',
  dates: 'Recorded Absence Dates',
  deficit_hours: 'Estimated Deficit Hours',
  consecutive_weeks: 'Consecutive Flagged Weeks',
  matched_keywords: 'Flagged Task Keywords',
  report_weeks: 'Report Week Numbers',
  pending_document: 'Missing Compliance Document',
  submission_state: 'Current Submission Status',
  absences: 'Absence Count'
};

function formatEvidenceKey(key) {
  return EVIDENCE_KEY_LABELS[key] || String(key).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatEvidenceVal(val, key) {
  if (val == null) return 'None recorded';
  if (Array.isArray(val)) {
    if (key === 'report_weeks') return val.map(w => `Week ${w}`).join(', ');
    return val.join(', ');
  }
  if (typeof val === 'number') {
    if (key === 'deficit_hours') return `${val} hrs`;
    if (key === 'consecutive_unexcused_days') return `${val} day${val === 1 ? '' : 's'}`;
    if (key === 'consecutive_weeks') return `${val} week${val === 1 ? '' : 's'}`;
  }
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
}

function AlertReview({ alert, user, db, onChange, onDone }) {
  const result = policyExplanation(alert, db.policyCorpus);
  const existingMessage = alert.dispatchedMessage || alert.finalDispatchedText || '';
  const [message, setMessage] = useState(existingMessage || alert.draftMessage || '');
  const [stage, setStage] = useState(alert.interventionStage || 'warning_1');
  const [reason, setReason] = useState(alert.dismissedReason || '');
  const { run, busy, notice } = useMutation(onChange);
  const isDismissed = /dismissed/i.test(String(alert.hitlStatus || alert.status || ''));
  const isDispatched = /dispatched/i.test(String(alert.hitlStatus || alert.status || ''));

  const evidenceObj = typeof alert.evidence === 'string'
    ? (() => { try { return JSON.parse(alert.evidence); } catch { return null; } })()
    : alert.evidence;
  const evidenceEntries = evidenceObj && typeof evidenceObj === 'object' ? Object.entries(evidenceObj) : [];

  const decide = async action => {
    if (action === 'dismiss' && reason.trim().length < 5) return;
    if (await run(() => reviewAlert(user, alert.id, action, { message, stage, reason, originalDraft: result.synthesisText }), 'Governance decision and audit record saved.')) onDone();
  };
  return <div className="space-y-5">{notice}
    <Notice tone="warning" title="Human Review Required">This alert is an indicator, not a confirmed finding. Verify the source records before deciding.</Notice>
    {isDispatched && <Notice tone="info" title="Current Status: Dispatched">Advisory was previously dispatched to {alert.student || 'the student'}. Submitting below will update the intervention stage or advisory message.</Notice>}
    {isDismissed && <Notice tone="neutral" title="Current Status: Dismissed">Indicator was previously dismissed{alert.dismissedReason ? `: "${alert.dismissedReason}"` : '.'} Submitting an advisory below will re-open and dispatch it.</Notice>}
    <Card className="p-4">
      <h3 className="font-bold text-ink">Recorded Indicators</h3>
      {(alert.triggers || []).length ? <ul className="list-disc space-y-1 pl-5 text-sm text-ink mt-2">{alert.triggers.map((trigger, index) => <li key={index}>{trigger}</li>)}</ul> : <p className="text-sm text-muted mt-2">No indicators recorded.</p>}
      <details className="mt-3">
        <summary className="min-h-[44px] cursor-pointer py-3 font-semibold text-ink">View Raw Evidence Fields</summary>
        {evidenceEntries.length > 0 ? (
          <dl className="grid gap-3 sm:grid-cols-2 rounded-panel bg-subtle p-3.5 border border-line text-xs mt-2">
            {evidenceEntries.map(([k, v]) => (
              <div key={k} className="space-y-0.5">
                <dt className="font-semibold text-muted">{formatEvidenceKey(k)}</dt>
                <dd className="font-medium text-ink m-0 break-words">{formatEvidenceVal(v, k)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="rounded-panel bg-subtle p-3 border border-line text-xs text-muted mt-2">No evidence fields recorded.</p>
        )}
      </details>
    </Card>
    <Card className="space-y-3 p-4">
      <h3 className="font-bold text-ink">Policy References</h3>
      {result.retrievedClauses.map(clause => <blockquote key={clause.chunkId} className="border-l-4 border-accent pl-3 py-1.5 bg-subtle rounded-r text-sm"><b>{clause.sourceDoc} · {clause.sectionRef}</b><p className="mt-1 text-ink">{clause.verbatimText}</p></blockquote>)}
      {!result.retrievedClauses.length && <p>No verified policy references are available.</p>}
      <p className="text-sm text-muted">{result.synthesisText || 'No policy explanation is available.'}</p>
    </Card>
    <Card className="space-y-4 p-4">
      <h3 className="font-bold text-ink">Human Decision</h3>
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-ink">Dispatch Advisory to Intern</h4>
        <Field label="Intervention Stage" options={[{ value: 'warning_1', label: 'First warning' }, { value: 'warning_2', label: 'Second warning' }, { value: 'case_conference', label: 'Case conference' }, { value: 'remedial_plan', label: 'Remedial plan' }]} value={stage} onChange={event => setStage(event.target.value)}/>
        <Field label="Advisory Message" multiline value={message} onChange={event => setMessage(event.target.value)} placeholder="Enter formal advisory message for the intern..."/>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button disabled={busy} onClick={() => decide('approve')}>Approve & Send</Button>
          <Button variant="secondary" disabled={busy} onClick={() => decide('edit')}>Send Edited Advisory</Button>
        </div>
      </div>
      <div className="border-t border-line pt-4 space-y-3">
        <h4 className="text-sm font-semibold text-ink">Dismiss Risk Flag</h4>
        <Field label="Dismissal / Override Reason (Minimum 5 Characters)" multiline value={reason} onChange={event => setReason(event.target.value)} placeholder="State the justification for dismissing this early-warning indicator..." hint={reason.trim().length > 0 && reason.trim().length < 5 ? 'Minimum 5 characters required.' : undefined}/>
        <Button variant="danger" disabled={busy || reason.trim().length < 5} onClick={() => decide('dismiss')}>Dismiss Flag</Button>
      </div>
    </Card>
  </div>;
}
const AUDIT_ACTION_LABELS = {
  CLEARANCE_GRANTED: 'Clearance granted',
  ALERT_DISMISSED: 'Alert dismissed',
  POLICY_CREATED: 'Policy clause added'
};

const auditActionLabel = value => AUDIT_ACTION_LABELS[value] || (value ? String(value).toLowerCase().replace(/_/g, ' ') : 'Not recorded');

function formatAuditTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function Audit({ db = {} }) {
  const [college, setCollege] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const events = Array.isArray(db.auditLogs) ? db.auditLogs : null;
  const colleges = collegeCodesForWorkspace(db);
  const eventTypes = events ? [...new Set(events.map(item => item.actionType).filter(Boolean))] : [];
  const rows = (events || []).filter(item => (college === 'ALL' || item.college === college || item.college === 'ALL') && (category === 'ALL' || item.actionType === category));
  const filtered = college !== 'ALL' || category !== 'ALL';
  function download() { const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'internms-audit.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return <WorkspacePage title="Audit Trail" subtitle="Decisions and system events recorded in this workspace." action={rows.length ? <Button variant="secondary" onClick={download}>Export filtered events</Button> : undefined}>
    <div className="audit-view">
      <Notice tone="info" title="Records are not authoritative">Authoritative audit records are unavailable until the backend is connected. The events below reflect what is recorded in this workspace.</Notice>
      {events === null && <Notice tone="warning" title="Audit trail unavailable">No audit events have been loaded in this workspace. Events will appear here when institutional records are available.</Notice>}
      {events && events.length > 0 && <SummaryMetrics className="audit-summary" ariaLabel="Audit summary" accent="info" items={[
        { label: 'Recorded Events', value: events.length },
        { label: 'Event Types', value: eventTypes.length },
        { label: 'Colleges Recorded', value: new Set(events.map(item => item.college).filter(value => value && value !== 'ALL')).size }
      ]} />}
      <div className="audit-filters">
        <Field label="College" options={[{ value: 'ALL', label: 'All colleges' }, ...colleges.map(code => ({ value: code, label: `${code}${NEMSU_COLLEGES[code]?.name ? ` · ${NEMSU_COLLEGES[code].name}` : ''}` }))]} value={college} onChange={event => setCollege(event.target.value)} />
        <Field label="Event Type" options={[{ value: 'ALL', label: 'All event types' }, ...eventTypes.map(type => ({ value: type, label: auditActionLabel(type) }))]} value={category} onChange={event => setCategory(event.target.value)} />
      </div>
      <DataTable title="Audit Records" rows={rows} emptyTitle={filtered ? 'No events match' : 'No audit events recorded yet'} emptyDescription={filtered ? 'Adjust the college or event type filter.' : 'Events will appear here as decisions are recorded.'} emptyIcon="calendar" columns={[
        { key: 'timestamp', label: 'Time', render: item => item.timestamp ? formatAuditTimestamp(item.timestamp) : 'Not recorded' },
        { key: 'actorName', label: 'Recorded by', render: item => item.actorName ? `${item.actorName}${item.actorRole ? ` · ${item.actorRole}` : ''}` : 'Not recorded' },
        { key: 'actionType', label: 'Event', render: item => auditActionLabel(item.actionType) },
        { key: 'college', label: 'College', render: item => item.college || 'All colleges' },
        { key: 'targetStudent', label: 'Student', render: item => item.targetStudent || 'No student target' },
        { key: 'summary', label: 'Summary', render: item => item.summary || 'Not recorded' },
        { key: 'actions', label: 'Details', render: item => <Button variant="secondary" onClick={() => setSelected(item)}>View</Button> }
      ]} />
      {selected && <Modal title="Audit event details" onClose={() => setSelected(null)}>
        <dl className="audit-detail">
          <div><dt>Event</dt><dd>{auditActionLabel(selected.actionType)}</dd></div>
          <div><dt>Recorded by</dt><dd>{selected.actorName ? `${selected.actorName}${selected.actorRole ? ` · ${selected.actorRole}` : ''}` : 'Not recorded'}</dd></div>
          <div><dt>College</dt><dd>{selected.college || 'All colleges'}</dd></div>
          <div><dt>Student</dt><dd>{selected.targetStudent || 'No student target recorded'}</dd></div>
          <div><dt>Time</dt><dd>{selected.timestamp ? formatAuditTimestamp(selected.timestamp) : 'Not recorded'}</dd></div>
          <div><dt>Source</dt><dd>{selected.source || 'Not recorded'}</dd></div>
          <div><dt>Summary</dt><dd>{selected.summary || 'Not recorded'}</dd></div>
        </dl>
        <details className="audit-raw"><summary>Show raw event fields</summary><pre>{JSON.stringify(selected, null, 2)}</pre></details>
      </Modal>}
    </div>
  </WorkspacePage>;
}