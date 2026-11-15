import { useState } from 'react';
import './placement.css';
import { Button, Card, EmptyState, StatusBadge, SummaryMetrics } from '../components/ui.jsx';
import { DataTable, Field, Modal, WorkspacePage, useMutation } from '../components/workflow.jsx';
import { scopedStudents } from '../services/records.js';
import { savePlacement } from '../services/applicationService.js';
import { placementRankings, placementEligibility } from '../services/placementAvailability.js';
import { StudentPlacement } from './StudentPlacement.jsx';
import { collegeCodesForWorkspace, NEMSU_COLLEGES } from '../config/institution.js';

export function Placement({ user, db, onChange }) {
  if (user.role === 'student') return <StudentPlacement user={user} db={db} onChange={onChange} />;
  if (user.role === 'coordinator') return <CoordinatorPlacement user={user} db={db} onChange={onChange} />;
  return <StaffPlacement user={user} db={db} onChange={onChange} />;
}

function CoordinatorPlacement({ user, db = {}, onChange }) {
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [reason, setReason] = useState('');
  const { run, busy, notice } = useMutation(onChange);
  const students = scopedStudents(db, user);
  const records = students.filter(item => status === 'ALL' || (item.placementStatus || 'Unplaced') === status);
  const student = students.find(item => item.id === selected);
  const rankings = student ? placementRankings(student, db.htes || [], db.collegeSettings || {}) : [];
  const statuses = [...new Set(students.map(item => item.placementStatus || 'Unplaced'))];
  const pendingPreferences = students.filter(item => item.placementStatus === 'Pending Coordinator Endorsement').length;
  const assignedCount = students.filter(item => item.company && !/^unassigned/i.test(item.company)).length;
  return <WorkspacePage title="Placement review" subtitle="Review student placement preferences for your college.">
    <div className="coordinator-placement">
      {notice}
      <SummaryMetrics className="placement-review-summary" ariaLabel="Placement summary" items={[
        { label: 'Pending preferences', value: pendingPreferences },
        { label: 'Assigned students', value: assignedCount },
        { label: 'Students in scope', value: students.length }
      ]} />
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Placement status" options={['ALL', ...statuses]} value={status} onChange={event => setStatus(event.target.value)} /></div>
    <DataTable title="Student placement preferences" rows={records} emptyTitle="No placement records" emptyDescription="Student preferences will appear here when records are available." emptyIcon="briefcase" columns={[
      { key: 'name', label: 'Student' }, { key: 'program', label: 'Program' }, { key: 'preferredHte', label: 'Preferred host' }, { key: 'company', label: 'Assigned host' }, { key: 'placementStatus', label: 'Status' },
      { key: 'actions', label: 'Actions', render: item => <Button variant="secondary" onClick={() => setSelected(item.id)}>Review matches</Button> }
    ]} />
    {student && <Modal title={`${student.name} · Placement review`} onClose={() => { setSelected(null); setConfirmation(null); }}>
      <div className="space-y-4"><section><h3 className="text-lg font-semibold">Student placement status</h3><p>{student.program || 'Program not recorded'} · {student.placementStatus || 'Unplaced'}</p><p>Preferred host: {student.preferredHte || 'No preference recorded'} · Assigned host: {student.company || 'Not assigned'}</p></section>
        <Notice tone="info" title="Recommendations unavailable">Placement recommendations and eligibility verification are unavailable until the backend is connected.</Notice>
        {rankings.length ? (
          <div className="space-y-3 rounded-panel border border-line bg-subtle p-4">
            <p className="text-sm font-semibold">Recommendation details are unavailable</p>
            <p className="text-sm text-muted">The backend is not connected, so the university cannot generate placement recommendations or eligibility rankings while records are still being reviewed.</p>
            <p className="text-sm text-muted">Use the student profile, host preference, and coordinator notes to make the final decision.</p>
          </div>
        ) : <EmptyState title="No placement recommendations" description="Host records may exist, but no ranking or eligibility results are currently available." icon="briefcase" />}
      </div>
    </Modal>}
    {confirmation && student && <Modal title="Confirm placement assignment" onClose={() => setConfirmation(null)}><p>{student.name} → {confirmation.company || 'Host company'} · {confirmation.roleTitle || 'Role not recorded'}</p>
      <Notice tone="warning" title="Assignment cannot be completed">Placement changes are unavailable until the backend is connected.</Notice>
      <form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (await run(() => savePlacement(user, student.id, confirmation.hteId, reason), 'Placement decision saved.')) setConfirmation(null); }}>
        {confirmation.rank !== 1 && student.preferredHte !== confirmation.company && <Field label="Reason for assignment decision" multiline required minLength={5} value={reason} onChange={event => setReason(event.target.value)} />}
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Confirm assignment'}</Button>
      </form>
    </Modal>}
    </div>
  </WorkspacePage>;
}

function StaffPlacement({ user, db, onChange }) {
  const [college, setCollege] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState(user.role === 'student' ? user.id : null);
  const [confirmation, setConfirmation] = useState(null);
  const [reason, setReason] = useState('');
  const { run, busy, notice } = useMutation(onChange);
  const colleges = collegeCodesForWorkspace(db);
  const students = scopedStudents(db, user, college);
  const student = students.find(item => item.id === selected);
  const rankings = student ? placementRankings(student, db.htes, db.collegeSettings) : [];
  const review = student && <div className="space-y-4"><h2 className="text-xl font-bold">{student.name} · Placement review</h2><p>{student.program} · {student.placementStatus || 'Unplaced'}</p><p>Assigned host: {student.company || 'Unassigned'} · Preferred: {student.preferredHte || 'None'}</p><div className="flex flex-wrap gap-2">{Object.entries(placementEligibility(student, null, db.collegeSettings).gates).map(([key, gate]) => <span key={key} title={gate.detail}><StatusBadge tone={gate.pass ? 'success' : 'warning'}>{gate.label}</StatusBadge></span>)}</div><p className="text-sm text-slate-600">Placement recommendations and eligibility verification are unavailable until the backend is connected.</p><div className="rounded-panel border border-line bg-subtle p-4"><p className="text-sm font-semibold">No partner recommendation is available</p><p className="mt-2 text-sm text-muted">The university cannot generate rankings from current records until the backend is connected. Review the student's profile and the intended host decision manually.</p></div></div>;
  // Placement recommendation cards are unavailable until the backend provides ranking data.
  return <WorkspacePage title="Placement management">{notice}{user.role !== 'student' && <><div className="grid gap-4 sm:grid-cols-2">{user.role === 'admin' && colleges.length > 0 && <Field label="College scope" options={[{ value: 'ALL', label: 'All colleges' }, ...colleges.map(code => ({ value: code, label: `${code}${NEMSU_COLLEGES[code]?.name ? ` · ${NEMSU_COLLEGES[code].name}` : ''}` }))]} value={college} onChange={event => { setCollege(event.target.value); setSelected(null); }}/>}<Field label="Placement status" options={['ALL', ...new Set(students.map(item => item.placementStatus || 'Unplaced'))]} value={status} onChange={event => setStatus(event.target.value)}/></div><DataTable title="Placement records" rows={students.filter(item => status === 'ALL' || (item.placementStatus || 'Unplaced') === status)} emptyTitle="No placement records" emptyDescription="Placement records will appear when available." emptyIcon="briefcase" columns={[ { key: 'name', label: 'Student' }, { key: 'college', label: 'College' }, { key: 'program', label: 'Program' }, { key: 'gpa', label: 'GPA' }, { key: 'preferredHte', label: 'Preferred host' }, { key: 'company', label: 'Assigned host' }, { key: 'placementStatus', label: 'Status' }, { key: 'actions', label: 'Actions', render: item => <Button variant="secondary" onClick={() => setSelected(item.id)}>Review matches</Button> }]}/></>}{user.role === 'student' ? review : student && <Modal title="Placement details" onClose={() => { setSelected(null); setConfirmation(null); }}>{review}{notice}</Modal>}{confirmation && student && <Modal title={user.role === 'student' ? 'Submit placement preference?' : 'Confirm placement assignment'} onClose={() => setConfirmation(null)}><p>{student.name} → {confirmation.company} · {confirmation.roleTitle}</p><form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (await run(() => savePlacement(user, student.id, confirmation.hteId, reason), user.role === 'student' ? 'Preference saved for coordinator review.' : 'Deployment and partner capacity updated.')) setConfirmation(null); }}>{user.role !== 'student' && confirmation.rank !== 1 && student.preferredHte !== confirmation.company && <Field label="Reason for ranking override" multiline required minLength={5} value={reason} onChange={event => setReason(event.target.value)}/>}<Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Confirm'}</Button>{notice}</form></Modal>}</WorkspacePage>;
}