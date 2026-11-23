import { useState } from 'react';
import './settings.css';
import './corpus.css';
import './staff.css';
import { StatusBadge, Notice, SummaryMetrics } from '../components/ui.jsx';
import './partners.css';
import { Button, Card } from '../components/ui.jsx';
import { DataTable, Field, Modal, SearchField, WorkspacePage, useMutation } from '../components/workflow.jsx';
import { createPolicy, createStaff, savePartner, saveSettings } from '../services/applicationService.js';
import { settingsFields } from '../services/management.js';
import { NEMSU_COLLEGES, collegeCodesForWorkspace } from '../config/institution.js';

function RecordForm({ initial, fields, submit, onChange, onDone }) {
  const [values, setValues] = useState(initial);
  const { run, busy, notice } = useMutation(onChange);
  return <form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (await run(() => submit(values))) onDone?.(); }}>{notice}{fields.map(({ key, ...field }) => <Field key={key} required {...field} value={values[key] ?? ''} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))}/>)}<Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></form>;
}
export function Partners({ user, db = {}, onChange }) {
  const [college, setCollege] = useState(user.college === 'ALL' ? 'ALL' : user.college || 'ALL');
  const [edit, setEdit] = useState(null);
  const colleges = collegeCodesForWorkspace(db);
  const supervisor = user.role === 'supervisor';
  const admin = user.role === 'admin';
  const records = (Array.isArray(db.htes) ? db.htes : []).filter(item => supervisor ? item.name === user.company : user.role === 'coordinator' ? item.college === user.college : college === 'ALL' || item.college === college);
  const collegeOptions = colleges.map(code => ({ value: code, label: `${code}${NEMSU_COLLEGES[code]?.name ? ` · ${NEMSU_COLLEGES[code].name}` : ''}` }));
  const fields = supervisor
    ? [{ key: 'roleTitle', label: 'Role Title' }, { key: 'description', label: 'Role Description & Training Scope', multiline: true }, { key: 'requiredSkills', label: 'Required Skills (Comma Separated)' }]
    : [{ key: 'name', label: 'Company Name' }, { key: 'college', label: 'College', options: user.role === 'coordinator' ? [user.college] : collegeOptions }, { key: 'supervisorName', label: 'Supervisor Name' }, { key: 'inviteToken', label: 'Supervisor Invitation Token' }, { key: 'roleTitle', label: 'Role Title' }, { key: 'maxSlots', label: 'Maximum Slots', type: 'number', min: 1, max: 50 }, { key: 'minGpa', label: 'GPA Cutoff', type: 'number', min: 1, max: 3, step: 0.05 }, { key: 'description', label: 'Role Description & Training Scope', multiline: true }, { key: 'requiredSkills', label: 'Required Skills (Comma Separated)' }];
  const pendingInvitationCount = records.filter(item => item.inviteToken && !item.supervisorId).length;
  const collegesCovered = new Set(records.map(item => item.college).filter(value => value && value !== 'ALL')).size;
  const openCreate = () => setEdit({ name: '', college: user.role === 'coordinator' ? user.college : college === 'ALL' ? '' : college, supervisorName: '', inviteToken: '', roleTitle: '', maxSlots: '', minGpa: '', description: '', requiredSkills: [] });
  const scopedEmpty = !supervisor && admin && college !== 'ALL';
  return <WorkspacePage title={supervisor ? 'Job Postings' : 'Partner Companies'} subtitle={supervisor ? 'Manage the role information shared with your host company.' : admin ? 'Manage host company records across all colleges.' : 'Manage host company records for your college.'} action={!supervisor && <Button onClick={openCreate} disabled={admin && colleges.length === 0}>Add Partner</Button>}>
    {!supervisor && <>
      <SummaryMetrics className="partner-summary" ariaLabel="Partner overview" items={[
        { label: 'Host Companies', value: records.length },
        { label: 'Invitations Pending', value: pendingInvitationCount },
        { label: 'Capacity Recorded', value: records.filter(item => Number.isFinite(Number(item.maxSlots))).length },
        ...(admin ? [{ label: 'Colleges Covered', value: collegesCovered }] : [])
      ]} />
    </>}
    {admin && colleges.length > 0 && <Field label="College Scope" options={[{ value: 'ALL', label: 'All colleges' }, ...collegeOptions]} value={college} onChange={event => setCollege(event.target.value)} />}
    {supervisor && <section className="job-posting-context"><h2>Role Information</h2><p>Edit only details confirmed by your company. Capacity, eligibility rules, and placement decisions are managed separately by the college.</p></section>}
    {supervisor && !records.length && <div role="status" className="job-posting-unavailable">No job posting record is available for this company yet.</div>}
    <DataTable title={supervisor ? 'Job Posting' : 'Partner Directory'} rows={records} emptyTitle={scopedEmpty ? 'No partner records in this college' : 'No partner records yet'} emptyDescription={scopedEmpty ? 'Select a different college scope.' : 'Add the first host company record.'} emptyIcon="building" columns={[
      { key: 'name', label: 'Company' }, { key: 'college', label: 'College' }, { key: 'location', label: 'Location' }, { key: 'roleTitle', label: 'Role' }, { key: 'supervisorName', label: 'Representative' }, { key: 'supervisorEmail', label: 'Contact' }, { key: 'minGpa', label: 'GPA Cutoff' }, { key: 'slots', label: 'Capacity', render: item => item.maxSlots == null || item.filledSlots == null ? 'Not recorded' : `${item.filledSlots}/${item.maxSlots}` },
      ...(!supervisor ? [{ key: 'inviteToken', label: 'Invitation Status', render: item => <StatusBadge tone={item.inviteToken && !item.supervisorId ? 'warning' : 'neutral'}>{item.inviteToken && !item.supervisorId ? 'Invitation pending' : item.supervisorId ? 'Representative linked' : 'Not configured'}</StatusBadge> }] : []),
      { key: 'actions', label: 'Actions', render: item => <Button variant="secondary" onClick={() => setEdit({ ...item })}>{supervisor ? 'Edit Posting' : 'Edit'}</Button> }
    ]} />
    {edit && <Modal title={edit.id ? (supervisor ? 'Edit Job Posting' : 'Edit Partner Company') : 'Add Partner Company'} onClose={() => setEdit(null)}><div className="partner-edit-note"><p>Only enter company and role information confirmed by the partner. Missing values will not be filled automatically.</p></div><RecordForm initial={{ ...edit, requiredSkills: Array.isArray(edit.requiredSkills) ? edit.requiredSkills.join(', ') : edit.requiredSkills || '' }} fields={fields} submit={values => savePartner(user, edit.id, values)} onChange={onChange} onDone={() => setEdit(null)} /></Modal>}
  </WorkspacePage>;
}
const STAFF_ROLE_LABELS = {
  admin: 'Administrator',
  coordinator: 'OJT Coordinator',
  supervisor: 'Host Company Representative'
};

export function Staff({ user, db = {}, onChange }) {
  const [open, setOpen] = useState(false);
  const [college, setCollege] = useState('ALL');
  const users = Array.isArray(db.users) ? db.users : [];
  const colleges = collegeCodesForWorkspace(db);
  const partnerCompanies = (Array.isArray(db.htes) ? db.htes : []).map(item => item.name).filter(Boolean);
  const staff = users.filter(item => item.role !== 'student' && (college === 'ALL' || item.college === college || item.role === 'supervisor'));
  return <WorkspacePage title="Staff Accounts" subtitle="Review coordinator and host representative accounts." action={<Button onClick={() => setOpen(true)} disabled={colleges.length === 0}>Add Staff Account</Button>}>
    {colleges.length === 0 && <Notice tone="warning" title="College Catalog Unavailable">Staff accounts require a verified college scope. Configure the institution college catalog before creating accounts.</Notice>}
    <SummaryMetrics className="staff-summary" ariaLabel="Staff overview" accent="info" items={[
      { label: 'OJT Coordinators', value: staff.filter(item => item.role === 'coordinator').length },
      { label: 'Host Representatives', value: staff.filter(item => item.role === 'supervisor').length }
    ]} />
    {colleges.length > 0 && <Field label="College Scope" options={[{ value: 'ALL', label: 'All colleges' }, ...colleges.map(code => ({ value: code, label: `${code}${NEMSU_COLLEGES[code]?.name ? ` · ${NEMSU_COLLEGES[code].name}` : ''}` }))]} value={college} onChange={event => setCollege(event.target.value)} />}
    <DataTable title="Staff Directory" rows={staff} emptyTitle="No staff accounts" emptyDescription={college === 'ALL' ? 'Add the first coordinator or host representative account.' : 'No staff accounts in this college scope.'} emptyIcon="users" columns={[
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role', render: item => STAFF_ROLE_LABELS[item.role] || item.role || 'Not recorded' },
      { key: 'email', label: 'Email', render: item => item.email || 'Not recorded' },
      { key: 'scope', label: 'Scope', render: item => item.college || item.company || 'Not recorded' },
      { key: 'inviteToken', label: 'Invitation', render: item => item.inviteToken ? 'Token issued' : 'Not issued' }
    ]} />
    {open && <Modal title="Create staff account" onClose={() => setOpen(false)}><StaffAccountForm user={user} collegeOptions={collegeOptions} partnerOptions={partnerCompanies} onChange={onChange} onDone={() => setOpen(false)} /></Modal>}
  </WorkspacePage>;
}

function StaffAccountForm({ user, collegeOptions, partnerOptions, onChange, onDone }) {
  const [role, setRole] = useState('coordinator');
  const [values, setValues] = useState({ name: '', id: '', pass: '', scope: '' });
  const supervisor = role === 'supervisor';
  const { run, busy, notice } = useMutation(onChange);
  const setField = key => event => setValues(previous => ({ ...previous, [key]: event.target.value }));
  return <form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (await run(() => createStaff(user, { role, ...values }))) onDone?.(); }}>
    {notice}
    <Field label="Role" options={[{ value: 'coordinator', label: 'OJT Coordinator' }, { value: 'supervisor', label: 'Host Company Representative' }]} value={role} onChange={event => setRole(event.target.value)} />
    <p className="text-sm text-muted">{supervisor ? 'Host representatives sign in with email and password.' : 'Coordinators sign in with their institutional Google account. No password is required when creating the account.'}</p>
    <Field required label="Full name" value={values.name} onChange={setField('name')} />
    <Field required label="Login ID / email" value={values.id} onChange={setField('id')} />
    {supervisor && <Field required label="Initial password" type="password" value={values.pass} onChange={setField('pass')} />}
    <div className="space-y-1.5">
      <Field required label={supervisor ? 'Partner company' : 'College'} options={supervisor ? partnerOptions : collegeOptions} value={values.scope} onChange={setField('scope')} />
      {supervisor && partnerOptions.length === 0 && <p className="text-sm text-muted">No partner companies are recorded yet. Add a partner company first.</p>}
    </div>
    <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create account'}</Button>
  </form>;
}
function SettingsForm({ user, college, settings, onChange, groups }) {
  const [values, setValues] = useState({ ...settings, ruleBClericalKeywords: Array.isArray(settings.ruleBClericalKeywords) ? settings.ruleBClericalKeywords.join(', ') : settings.ruleBClericalKeywords || '' });
  const [errors, setErrors] = useState({});
  const { run, busy, notice } = useMutation(onChange);
  function validate() {
    const next = {};
    for (const [key, label, min, max] of settingsFields) {
      const value = values[key];
      if (value === '' || value == null || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) next[key] = `${label} must be between ${min} and ${max}.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }
  return <form className="settings-form" onSubmit={async event => { event.preventDefault(); if (!validate()) return; await run(() => saveSettings(user, college, { ...values, ruleBClericalKeywords: values.ruleBClericalKeywords.split(',').map(value => value.trim()).filter(Boolean) }), 'Settings saved.'); }}>
    {notice}
    {groups.map(group => <section className="settings-group" key={group.title}><div><h3>{group.title}</h3><p>{group.description}</p></div><div className="settings-fields">{group.fields.map(field => <Field key={field.key} label={field.label} type="number" min={field.min} max={field.max} step={field.step} required value={values[field.key] ?? ''} error={errors[field.key]} onChange={event => setValues(previous => ({ ...previous, [field.key]: event.target.value }))} hint={`Allowed range: ${field.min}–${field.max}`} />)}</div></section>)}
    <Field label="Flagged non-degree clerical terms" multiline value={values.ruleBClericalKeywords} hint="Comma-separated terms, only if approved by your college." onChange={event => setValues(previous => ({ ...previous, ruleBClericalKeywords: event.target.value }))} />
    <Button type="submit" disabled={busy} loading={busy} loadingLabel="Saving settings…">Save settings</Button>
  </form>;
}

export function Settings({ user, db = {}, onChange, connectionStatus = 'offline' }) {
  const admin = user.role === 'admin';
  const availableColleges = collegeCodesForWorkspace(db);
  const savedColleges = Object.keys(db.collegeSettings || {});
  const [college, setCollege] = useState(user.role === 'coordinator' ? user.college : savedColleges[0] || availableColleges[0] || '');
  const settings = db.collegeSettings?.[college];
  const initial = { ...(settings || {}), ruleBClericalKeywords: Array.isArray(settings?.ruleBClericalKeywords) ? settings.ruleBClericalKeywords.join(', ') : settings?.ruleBClericalKeywords || '' };
  const fields = settingsFields.map(([key, label, min, max, step]) => ({ key, label, min, max, step, type: 'number' }));
  const fieldGroups = [
    { title: 'Academic requirements', description: 'College-wide OJT quota and default GPA cutoff.', fields: fields.slice(0, 2) },
    { title: 'Attendance thresholds', description: 'Recorded limits used by attendance review rules.', fields: fields.slice(2, 4) },
    { title: 'Task review threshold', description: 'Weeks of mismatch before a review indicator is considered.', fields: fields.slice(4) }
  ];
  if (!college || availableColleges.length === 0) return <WorkspacePage title="College Settings" subtitle={admin ? 'Review approved settings across all colleges.' : 'Review approved settings for your college.'}><Notice tone="warning" title="College catalog unavailable">No institution-approved college catalog is available, so a college cannot be selected. Configure the catalog before managing college settings.</Notice></WorkspacePage>;
  return <WorkspacePage title="College Settings" subtitle={admin ? 'Review approved quotas and alert thresholds across all colleges.' : 'Review approved quotas and alert thresholds for your college.'}>
    {admin && <SummaryMetrics className="settings-summary" ariaLabel="Settings coverage" accent="info" items={[
      { label: 'Colleges with saved settings', value: savedColleges.filter(code => availableColleges.includes(code)).length },
      { label: 'Colleges in institution directory', value: Object.keys(NEMSU_COLLEGES).length }
    ]} />}
    {admin && savedColleges.length === 0 && <Notice tone="info" title="No College Settings Have Been Provisioned">College options are available, but no approved quotas or policy thresholds are saved yet. Select a college to see its setup status; values are not assumed.</Notice>}
    {admin && availableColleges.length > 0 && <Field label="College" options={availableColleges.map(code => ({ value: code, label: `${code}${NEMSU_COLLEGES[code]?.name ? ` · ${NEMSU_COLLEGES[code].name}` : ''}${db.collegeSettings?.[code] ? '' : ' · Settings not configured'}` }))} value={college} onChange={event => setCollege(event.target.value)} />}
    <div className="settings-context"><h2>{NEMSU_COLLEGES[college]?.name || college}</h2><p>Changes affect records and indicators for this college. Confirm values against approved institutional policy.</p></div>
    {!settings ? <Notice tone="warning" title="Settings unavailable · approved settings not configured">No saved policy settings exist for {college}. The settings form is unavailable until the institution approves and provisions values; no quotas or thresholds are assumed. {admin ? 'Provision approved values once they are confirmed by the institution.' : 'Ask an administrator to confirm and provision approved values.'}</Notice> : <>
      {connectionStatus !== 'connected' && <Notice tone="warning" title="Backend unavailable">Settings changes cannot be saved yet. Values shown come from the records currently available in this frontend.</Notice>}
      <SettingsForm key={college} user={user} college={college} settings={settings} onChange={onChange} groups={fieldGroups} />
    </>}
  </WorkspacePage>;
}
const POLICY_CATEGORY_LABELS = {
  RULE_A_ATTENDANCE: 'Attendance',
  RULE_B_MISALIGNMENT: 'Task alignment',
  RULE_C_DOCS: 'Documents'
};

const policyCategoryLabel = value => POLICY_CATEGORY_LABELS[value] || 'Uncategorized';

export function Corpus({ user, db = {}, onChange, connectionStatus = 'offline' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const clauses = Array.isArray(db.policyCorpus) ? db.policyCorpus : null;
  const visible = (clauses || []).filter(item => {
    const haystack = [item.title, item.chunkId, item.sourceDoc, item.sectionRef, item.verbatimText].filter(Boolean).join(' ').toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (category === 'ALL' || item.ruleCategory === category);
  });
  const filtered = Boolean(query) || category !== 'ALL';
  return <WorkspacePage title="Policy Corpus" subtitle="Approved institutional clauses used during alert review." action={<Button onClick={() => setOpen(true)}>Add policy clause</Button>}>
    <div className="corpus-view">
      {connectionStatus !== 'connected' && <Notice tone="info" title="Backend unavailable">New clauses cannot be saved until the Phase 4 backend is connected. Only enter clauses that the university has approved.</Notice>}
      {clauses === null && <Notice tone="warning" title="Corpus unavailable">No policy Corpus has been loaded in this workspace. Clauses will appear here when institutional records are available.</Notice>}
      {clauses && clauses.length > 0 && <SummaryMetrics className="corpus-summary" ariaLabel="Policy Corpus summary" accent="info" items={[
        { label: 'Recorded clauses', value: clauses.length },
        { label: 'Source documents', value: new Set(clauses.filter(item => item.sourceDoc).map(item => item.sourceDoc)).size },
        { label: 'Categories covered', value: `${new Set(clauses.filter(item => POLICY_CATEGORY_LABELS[item.ruleCategory]).map(item => item.ruleCategory)).size} of ${Object.keys(POLICY_CATEGORY_LABELS).length}` }
      ]} />}
      <div className="corpus-filters">
        <SearchField label="Search Clauses" value={query} placeholder="Title, clause ID, source, or section" onChange={event => setQuery(event.target.value)} onClear={() => setQuery('')} />
        <Field label="Alert Category" options={[{ value: 'ALL', label: 'All categories' }, ...Object.entries(POLICY_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))]} value={category} onChange={event => setCategory(event.target.value)} />
      </div>
      <DataTable title="Policy Clauses" rows={visible} emptyTitle={filtered ? 'No clauses match' : 'No policy clauses yet'} emptyDescription={filtered ? 'Adjust the search or category filter.' : 'Add the first approved clause to begin alert review.'} emptyIcon="document" columns={[
        { key: 'title', label: 'Clause', render: item => <span><strong>{item.title || 'Untitled clause'}</strong><small className="corpus-clause-id"> {item.chunkId}</small></span> },
        { key: 'ruleCategory', label: 'Category', render: item => policyCategoryLabel(item.ruleCategory) },
        { key: 'sourceDoc', label: 'Source', render: item => item.sourceDoc ? `${item.sourceDoc}${item.sectionRef ? ` · ${item.sectionRef}` : ''}` : 'Not recorded' },
        { key: 'verbatimText', label: 'Clause text', render: item => item.verbatimText ? <details className="corpus-clause"><summary>Read clause</summary><p>{item.verbatimText}</p></details> : 'Not recorded' },
        { key: 'lastIndexed', label: 'Recorded', render: item => item.lastIndexed || 'Not recorded' }
      ]} />
      {open && <Modal title="Add policy clause" onClose={() => setOpen(false)}><RecordForm initial={{ chunkId: '', sourceDoc: '', sectionRef: '', title: '', ruleCategory: 'RULE_A_ATTENDANCE', verbatimText: '' }} fields={[{ key: 'chunkId', label: 'Clause ID' }, { key: 'ruleCategory', label: 'Alert category', options: Object.entries(POLICY_CATEGORY_LABELS).map(([value, label]) => ({ value, label })) }, { key: 'sourceDoc', label: 'Source document' }, { key: 'sectionRef', label: 'Section reference' }, { key: 'title', label: 'Clause title' }, { key: 'verbatimText', label: 'Clause text', multiline: true }]} submit={values => createPolicy(user, values)} onChange={onChange} onDone={() => setOpen(false)}/></Modal>}
    </div>
  </WorkspacePage>;
}