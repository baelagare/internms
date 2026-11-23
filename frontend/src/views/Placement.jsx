import { useState } from 'react';
import './placement.css';
import { Button, Card, EmptyState, Notice, StatusBadge, SummaryMetrics } from '../components/ui.jsx';
import { DataTable, Field, Modal, WorkspacePage, useMutation } from '../components/workflow.jsx';
import { scopedStudents } from '../services/records.js';
import { returnPlacementPreference, savePlacement } from '../services/applicationService.js';
import { placementRankings, placementEligibility } from '../services/placementAvailability.js';
import { StudentPlacement } from './StudentPlacement.jsx';
import { collegeCodesForWorkspace, NEMSU_COLLEGES } from '../config/institution.js';

export function Placement({ user, db, onChange, initialQuery }) {
  if (user.role === 'student') return <StudentPlacement user={user} db={db} onChange={onChange} />;
  if (user.role === 'coordinator') return <CoordinatorPlacement user={user} db={db} onChange={onChange} initialQuery={initialQuery} />;
  return <StaffPlacement user={user} db={db} onChange={onChange} initialQuery={initialQuery} />;
}

function CoordinatorPlacement({ user, db = {}, onChange, initialQuery }) {
  const [status, setStatus] = useState('ALL');
  const targetId = initialQuery?.studentId != null ? (Number(initialQuery.studentId) || initialQuery.studentId) : (initialQuery?.id != null ? (Number(initialQuery.id) || initialQuery.id) : null);
  const [selected, setSelected] = useState(targetId);
  const [confirmation, setConfirmation] = useState(null);
  const [reason, setReason] = useState('');
  const [assignedRole, setAssignedRole] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returningPreference, setReturningPreference] = useState(false);
  const { run, busy, notice } = useMutation(onChange);
  const students = scopedStudents(db, user);
  const records = students.filter(item => status === 'ALL' || (item.placementStatus || 'Unplaced') === status);
  const student = students.find(item => item.id === selected);
  const rankings = student ? placementRankings(student, db.htes || [], db.collegeSettings || {}) : [];
  const statuses = [...new Set(students.map(item => item.placementStatus || 'Unplaced'))];
  const pendingPreferences = students.filter(item => item.placementStatus === 'Pending Coordinator Endorsement').length;
  const assignedCount = students.filter(item => item.company && !/^unassigned/i.test(item.company)).length;
  return <WorkspacePage title="Placement Review" subtitle="Review student placement preferences for your college.">
    <div className="coordinator-placement">
      {notice}
      <SummaryMetrics className="placement-review-summary" ariaLabel="Placement summary" items={[
        { label: 'Pending Preferences', value: pendingPreferences },
        { label: 'Assigned Students', value: assignedCount },
        { label: 'Students in Scope', value: students.length }
      ]} />
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Placement Status" options={['ALL', ...statuses]} value={status} onChange={event => setStatus(event.target.value)} /></div>
    <DataTable title="Student Placement Preferences" rows={records} emptyTitle="No Placement Records" emptyDescription="Student preferences will appear here when records are available." emptyIcon="briefcase" columns={[
      { key: 'name', label: 'Student' }, { key: 'program', label: 'Program' }, { key: 'preferredHte', label: 'Preferred Host' }, { key: 'company', label: 'Assigned Host' }, { key: 'placementStatus', label: 'Status' },
      { key: 'actions', label: 'Actions', render: item => <Button variant="secondary" onClick={() => setSelected(item.id)}>Review Matches</Button> }
    ]} />
    {student && <Modal title={`${student.name} · Placement Review`} onClose={() => { if (!busy) { setSelected(null); setConfirmation(null); setReturningPreference(false); } }}>
      <div className="space-y-4"><section><h3 className="text-lg font-semibold">Student Placement Status</h3><p>{student.program || 'Program Not Recorded'} · {student.placementStatus || 'Unplaced'}</p><p>Preferred Host: {student.preferredHte || 'No Preference Recorded'} · Preferred Role: {student.preferredRole || 'Not recorded'} · Assigned Host: {student.company || 'Not Assigned'}</p>{student.preferenceStatus === 'Returned for Revision' && <Notice tone="warning" title="Preference returned to student">{student.preferenceFeedback || 'The student should revise and resubmit this preference.'}</Notice>}</section>
        <Notice tone="info" title="AI Placement Recommendations">
          Host training organizations are evaluated by the AI Placement Recommendation Engine using candidate skill overlap, degree program requirements, GPA standing, and partner slot quotas. Final deployment requires coordinator endorsement.
        </Notice>

        {rankings.length ? (
          <div className="space-y-3 rounded-panel border border-line bg-subtle p-4">
            {rankings.map(match => {
              const isCurrent = Boolean(student.company && !/^unassigned/i.test(student.company.trim()) && student.company.trim() === match.company);
              return (
                <article key={match.hteId} className={`rounded-panel border border-line bg-white p-4 ${isCurrent ? 'border-accent bg-accent-subtle/10' : ''}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">#{match.rank} · {match.company}</h4>
                      {isCurrent && <StatusBadge tone="info">Current placement</StatusBadge>}
                    </div>
                    <span className="font-bold tabular-nums">{match.matchPercent}% Match</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{match.roleTitle || 'Role Not Recorded'} · {match.matchingSkills.length} of {match.matchingSkills.length + match.skillsGap.length} Required Skills Matched · {match.eligibility.hardEligible === true ? 'Eligible' : match.eligibility.hardEligible === false ? 'Requirements Not Met' : 'Eligibility Unconfirmed'}</p>
                  <p className="mt-2 text-xs text-muted">Matched: {match.matchingSkills.join(', ') || 'None'} · Skills To Build: {match.skillsGap.join(', ') || 'None'}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted">{isCurrent ? 'Student is currently assigned to this host.' : ''}</p>
                    {isCurrent ? (
                      <Button variant="secondary" disabled>Already Assigned</Button>
                    ) : (
                      <Button
                        variant="primary"
                        disabled={busy || match.eligibility.hardEligible !== true}
                        onClick={() => { setReason(''); setAssignedRole(match.roleTitle || ''); setConfirmation(match); }}
                      >
                        Assign to this host
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : <EmptyState title="No Placement Recommendations" description="No host organizations are available to rank for this student." icon="briefcase" />}
        {student.placementStatus === 'Pending Coordinator Endorsement' && !returningPreference && <Button variant="secondary" disabled={busy} onClick={() => { setReturnReason(''); setReturningPreference(true); }}>Return preference for revision</Button>}
      </div>
    </Modal>}
    {returningPreference && student && <Modal title="Return Preference for Revision" onClose={() => { if (!busy) setReturningPreference(false); }}>
      <p>Return {student.name}’s preference for {student.preferredHte || 'the selected host'} to the student with revision guidance.</p>
      <form className="space-y-4" aria-busy={busy} onSubmit={async event => { event.preventDefault(); if (await run(() => returnPlacementPreference(user, student.id, returnReason), 'Preference returned to student for revision.')) { setReturningPreference(false); setSelected(null); setReturnReason(''); } }}>
        <Field label="Reason for returning preference" multiline required minLength={5} maxLength={1000} value={returnReason} onChange={event => setReturnReason(event.target.value)} hint="Explain what the student should change before resubmitting." />
        {notice}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={() => setReturningPreference(false)}>Cancel</Button><Button type="submit" disabled={busy || returnReason.trim().length < 5}>{busy ? 'Returning…' : 'Return to Student'}</Button></div>
      </form>
    </Modal>}
    {confirmation && student && <Modal title="Confirm Placement Assignment" onClose={() => { if (!busy) setConfirmation(null); }}><p>{student.name} → {confirmation.company || 'Host Company'} · {confirmation.roleTitle || 'Role Not Recorded'}</p>
      <form className="space-y-4" aria-busy={busy} onSubmit={async event => { event.preventDefault(); if (await run(() => savePlacement(user, student.id, confirmation.hteId, reason, assignedRole), 'Placement decision recorded and partner capacity updated.')) { setConfirmation(null); setSelected(null); setReason(''); setAssignedRole(''); } }}>
        <Field
          label="Assigned Role"
          value={assignedRole}
          onChange={event => setAssignedRole(event.target.value)}
          maxLength={150}
          required
          hint="Confirm or edit the role for the official deployment."
        />
        {confirmation.rank !== 1 && student.preferredHte !== confirmation.company && <Field label="Reason For Assignment Decision" multiline required minLength={5} value={reason} onChange={event => setReason(event.target.value)} />}
        {notice}
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirmation(null)}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Confirm Assignment'}</Button>
        </div>
      </form>
    </Modal>}
    </div>
  </WorkspacePage>;
}

function StaffPlacement({ user, db, onChange, initialQuery }) {
  const [college, setCollege] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const targetId = initialQuery?.studentId != null ? (Number(initialQuery.studentId) || initialQuery.studentId) : (initialQuery?.id != null ? (Number(initialQuery.id) || initialQuery.id) : null);
  const [selected, setSelected] = useState(user.role === 'student' ? user.id : targetId);
  const [confirmation, setConfirmation] = useState(null);
  const [reason, setReason] = useState('');
  const [assignedRole, setAssignedRole] = useState('');
  const { run, busy, notice } = useMutation(onChange);
  const colleges = collegeCodesForWorkspace(db);
  const students = scopedStudents(db, user, college);
  const student = students.find(item => item.id === selected);
  const rankings = student ? placementRankings(student, db.htes, db.collegeSettings) : [];
  const review = student && <div className="space-y-4"><h2 className="text-xl font-bold">{student.name} · Placement Review</h2><p>{student.program} · {student.placementStatus || 'Unplaced'}</p><p>Assigned Host: {student.company || 'Unassigned'} · Preferred Host: {student.preferredHte || 'None'}</p><div className="flex flex-wrap gap-2">{Object.entries(placementEligibility(student, null, db.collegeSettings).gates).map(([key, gate]) => <span key={key} title={gate.detail}><StatusBadge tone={gate.pass ? 'success' : 'warning'}>{gate.label}</StatusBadge></span>)}</div><Notice tone="info" title="AI Placement Recommendations">Rankings are computed by the AI Placement Recommendation Engine from candidate competency profiles, coursework alignment, academic standing, and host capacity. Final assignment decisions remain with the College OJT Coordinator.</Notice><div className="space-y-3">{rankings.map(match => {
  const isCurrent = Boolean(student.company && !/^unassigned/i.test(student.company.trim()) && student.company.trim() === match.company);
  return <article key={match.hteId} className={`rounded-panel border border-line bg-subtle p-4 ${isCurrent ? 'border-accent' : ''}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">#{match.rank} · {match.company}</h3>
        {isCurrent && <StatusBadge tone="info">Current placement</StatusBadge>}
      </div>
      <strong className="tabular-nums">{match.matchPercent}% Match</strong>
    </div>
    <p className="mt-1 text-sm text-muted">{match.roleTitle || 'Role Not Recorded'} · {match.matchingSkills.length} of {match.matchingSkills.length + match.skillsGap.length} Required Skills Matched · {match.eligibility.hardEligible === true ? 'Eligible' : match.eligibility.hardEligible === false ? 'Requirements Not Met' : 'Eligibility Unconfirmed'}</p>
    <p className="mt-2 text-xs text-muted">Matched Skills: {match.matchingSkills.join(', ') || 'None'} · Skills To Build: {match.skillsGap.join(', ') || 'None'}</p>
    <div className="mt-3 flex items-center justify-between gap-2">
      <p className="text-xs text-muted">{isCurrent ? 'Student is currently assigned to this host.' : ''}</p>
      {isCurrent ? (
        <Button variant="secondary" disabled>Already Assigned</Button>
      ) : (
        <Button variant="secondary" onClick={() => { setReason(''); setAssignedRole(match.roleTitle || ''); setConfirmation(match); }}>Assign to this host</Button>
      )}
    </div>
  </article>;
})}</div>{!rankings.length && <EmptyState title="No Placement Recommendations" description="No host organizations are available to rank for this student." icon="briefcase" />}</div>;
  return <WorkspacePage title="Placement Management">{notice}{user.role !== 'student' && <><div className="grid gap-4 sm:grid-cols-2">{user.role === 'admin' && colleges.length > 0 && <Field label="College Scope" options={[{ value: 'ALL', label: 'All colleges' }, ...colleges.map(code => ({ value: code, label: `${code}${NEMSU_COLLEGES[code]?.name ? ` · ${NEMSU_COLLEGES[code].name}` : ''}` }))]} value={college} onChange={event => { setCollege(event.target.value); setSelected(null); }}/>}<Field label="Placement Status" options={['ALL', ...new Set(students.map(item => item.placementStatus || 'Unplaced'))]} value={status} onChange={event => setStatus(event.target.value)}/></div><DataTable title="Placement Records" rows={students.filter(item => status === 'ALL' || (item.placementStatus || 'Unplaced') === status)} emptyTitle="No Placement Records" emptyDescription="Placement records will appear when available." emptyIcon="briefcase" columns={[ { key: 'name', label: 'Student' }, { key: 'college', label: 'College' }, { key: 'program', label: 'Program' }, { key: 'gpa', label: 'GPA' }, { key: 'preferredHte', label: 'Preferred Host' }, { key: 'company', label: 'Assigned Host' }, { key: 'placementStatus', label: 'Status' }, { key: 'actions', label: 'Actions', render: item => <Button variant="secondary" onClick={() => setSelected(item.id)}>Review Matches</Button> }]}/></>}{user.role === 'student' ? review : student && <Modal title="Placement Details" onClose={() => { setSelected(null); setConfirmation(null); }}>{review}{notice}</Modal>}{confirmation && student && <Modal title={user.role === 'student' ? 'Submit Placement Preference?' : 'Confirm Placement Assignment'} onClose={() => setConfirmation(null)}><p>{student.name} → {confirmation.company} · {confirmation.roleTitle}</p><form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (await run(() => savePlacement(user, student.id, confirmation.hteId, reason, assignedRole), user.role === 'student' ? 'Preference saved for coordinator review.' : 'Deployment and partner capacity updated.')) setConfirmation(null); }}>{user.role !== 'student' && <Field label="Assigned Role" value={assignedRole} onChange={event => setAssignedRole(event.target.value)} maxLength={150} required />}{user.role !== 'student' && confirmation.rank !== 1 && student.preferredHte !== confirmation.company && <Field label="Reason For Assignment Decision" multiline required minLength={5} value={reason} onChange={event => setReason(event.target.value)}/>}<Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Confirm Assignment'}</Button>{notice}</form></Modal>}</WorkspacePage>;
}