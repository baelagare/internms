import { useMemo, useState } from 'react';
import './alerts.css';
import './audit.css';
import { Button, Notice, SummaryMetrics } from '../components/ui.jsx';
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
  return <WorkspacePage title={user.role === 'coordinator' ? 'Risk alerts' : 'Early-warning risk alerts'} subtitle={user.role === 'coordinator' ? 'Review alerts for your college. Alert indicators require human review.' : user.role === 'admin' ? 'Review risk indicators across the university. Human review is required before any action is sent.' : undefined}>
    {(user.role === 'admin' || user.role === 'coordinator') && <>
      <Notice tone="info" title="Decision support is not connected">Policy-based recommendations are unavailable until approved policy sources and the backend are configured. Review recorded evidence; do not treat an alert as a finding.</Notice>
      <SummaryMetrics className="alert-summary" ariaLabel="Alert status summary" accent="warning" items={[
        { label: 'Needs review', value: pending.length },
        { label: 'Dispatched', value: dispatched.length },
        { label: 'Dismissed', value: dismissed.length }
      ]} />
      {user.role === 'admin' && colleges.length > 0 && <Field label="College scope" options={[{ value: 'ALL', label: 'All colleges' }, ...colleges.map(code => ({ value: code, label: `${code}${NEMSU_COLLEGES[code]?.name ? ` · ${NEMSU_COLLEGES[code].name}` : ''}` }))]} value={college} onChange={event => setCollege(event.target.value)} />}
      <Field label="Review status" options={[{ value: 'ALL', label: 'All alerts' }, { value: 'PENDING', label: 'Needs review' }, { value: 'DISPATCHED', label: 'Dispatched' }, { value: 'DISMISSED', label: 'Dismissed' }]} value={status} onChange={event => setStatus(event.target.value)} />
    </>}
    {user.role !== 'coordinator' && user.role !== 'admin' && <p className="text-sm">Policy-based advisories are unavailable until approved policy sources are configured.</p>}
    <DataTable title={user.role === 'coordinator' ? 'College alert records' : 'Risk alerts'} rows={visible} emptyTitle="No alerts in this view" emptyDescription="Alerts will appear here when records are available." emptyIcon="alert" columns={[{ key: 'student', label: 'Student' }, { key: 'company', label: 'Host company' }, { key: 'ruleLabel', label: 'Recorded category' }, { key: 'triggers', label: 'Recorded indicators', render: item => (item.triggers || []).join('; ') || 'Not recorded' }, { key: 'hitlStatus', label: 'Review status', render: item => item.hitlStatus || item.status || 'Not recorded' }, { key: 'actions', label: 'Actions', render: item => <Button variant="secondary" onClick={() => setSelected(item)}>Review details</Button> }]}/>
    {selected && <Modal title={`Alert review · ${selected.student || 'Student record'}`} onClose={() => setSelected(null)}><AlertReview key={selected.id} alert={selected} user={user} db={db} onChange={onChange} onDone={() => setSelected(null)} /></Modal>}
  </WorkspacePage>;
}
function AlertReview({ alert, user, db, onChange, onDone }) {
  const result = policyExplanation(alert, db.policyCorpus);
  const [message, setMessage] = useState(alert.draftMessage || '');
  const [stage, setStage] = useState('warning_1');
  const [reason, setReason] = useState('');
  const { run, busy, notice } = useMutation(onChange);
  const decide = async action => { if (await run(() => reviewAlert(user, alert.id, action, { message, stage, reason, originalDraft: result.synthesisText }), 'Governance decision and audit record saved.')) onDone(); };
  return <div className="space-y-5">{notice}<Notice tone="warning" title="Human review required">This alert is an indicator, not a confirmed finding. Verify the source records before deciding.</Notice><Card className="p-4"><h3 className="font-bold">Recorded indicators</h3>{(alert.triggers || []).length ? <ul className="list-disc space-y-1 pl-5">{alert.triggers.map((trigger, index) => <li key={index}>{trigger}</li>)}</ul> : <p>No indicators recorded.</p>}<details className="mt-3"><summary className="min-h-[44px] cursor-pointer py-3 font-semibold">View raw evidence fields</summary><pre className="overflow-auto whitespace-pre-wrap break-words text-xs">{alert.evidence ? JSON.stringify(alert.evidence, null, 2) : 'No evidence fields recorded.'}</pre></details></Card><Card className="space-y-3 p-4"><h3 className="font-bold">Policy references</h3>{result.retrievedClauses.map(clause => <blockquote key={clause.chunkId} className="border-l-2 border-line pl-3 text-sm"><b>{clause.sourceDoc} · {clause.sectionRef}</b><p>{clause.verbatimText}</p></blockquote>)}{!result.retrievedClauses.length && <p>No verified policy references are available.</p>}<p className="text-sm text-muted">{result.synthesisText || 'No policy explanation is available.'}</p></Card><Card className="space-y-4 p-4"><h3 className="font-bold">Human decision</h3><Field label="Intervention stage" options={[{ value: 'warning_1', label: 'First warning' }, { value: 'warning_2', label: 'Second warning' }, { value: 'case_conference', label: 'Case conference' }, { value: 'remedial_plan', label: 'Remedial plan' }]} value={stage} onChange={event => setStage(event.target.value)}/><Field label="Advisory message" multiline value={message} onChange={event => setMessage(event.target.value)}/><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => decide('approve')}>Approve & send</Button><Button variant="secondary" disabled={busy} onClick={() => decide('edit')}>Send edited advisory</Button></div><Field label="Dismissal / override reason (minimum 5 characters)" multiline value={reason} onChange={event => setReason(event.target.value)}/><Button variant="danger" disabled={busy} onClick={() => decide('dismiss')}>Dismiss flag</Button></Card></div>;
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
  return <WorkspacePage title="Audit trail" subtitle="Decisions and system events recorded in this workspace." action={rows.length ? <Button variant="secondary" onClick={download}>Export filtered events</Button> : undefined}>
    <div className="audit-view">
      <Notice tone="info" title="Records are not authoritative">Authoritative audit records are unavailable until the backend is connected. The events below reflect what is recorded in this workspace.</Notice>
      {events === null && <Notice tone="warning" title="Audit trail unavailable">No audit events have been loaded in this workspace. Events will appear here when institutional records are available.</Notice>}
      {events && events.length > 0 && <SummaryMetrics className="audit-summary" ariaLabel="Audit summary" accent="info" items={[
        { label: 'Recorded events', value: events.length },
        { label: 'Event types', value: eventTypes.length },
        { label: 'Colleges recorded', value: new Set(events.map(item => item.college).filter(value => value && value !== 'ALL')).size }
      ]} />}
      <div className="audit-filters">
        <Field label="College" options={[{ value: 'ALL', label: 'All colleges' }, ...colleges.map(code => ({ value: code, label: `${code}${NEMSU_COLLEGES[code]?.name ? ` · ${NEMSU_COLLEGES[code].name}` : ''}` }))]} value={college} onChange={event => setCollege(event.target.value)} />
        <Field label="Event type" options={[{ value: 'ALL', label: 'All event types' }, ...eventTypes.map(type => ({ value: type, label: auditActionLabel(type) }))]} value={category} onChange={event => setCategory(event.target.value)} />
      </div>
      <DataTable title="Audit records" rows={rows} emptyTitle={filtered ? 'No events match' : 'No audit events recorded yet'} emptyDescription={filtered ? 'Adjust the college or event type filter.' : 'Events will appear here as decisions are recorded.'} emptyIcon="calendar" columns={[
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