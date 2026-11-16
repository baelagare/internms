import { HostInternDirectory } from './HostInternDirectory.jsx';

import { useMemo, useState } from 'react';
import { SearchField } from '../components/foundation/records.jsx';
import { internDirectoryRecords } from '../services/internDirectory.js';
import './interns.css';
import { Button, StatusBadge, SummaryMetrics } from '../components/ui.jsx';
import { DataTable, Field, Modal, WorkspacePage, useMutation } from '../components/workflow.jsx';
import { approveEnrollment, grantClearance, rejectEnrollment } from '../services/applicationService.js';
import { collegeCodesForWorkspace, NEMSU_COLLEGES } from '../config/institution.js';
import { EvaluationDetails } from './Evaluations.jsx';
export function Interns(props) {
  return props.user?.role === 'supervisor' ? <HostInternDirectory {...props} /> : <InternalInternDirectory {...props} />;
}

function InternalInternDirectory({ user, db, onChange }) {
  const [college, setCollege] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [enrollmentFilter, setEnrollmentFilter] = useState('ALL');
  const { run, busy, notice } = useMutation(onChange);
  const directory = internDirectoryRecords(db, user, college);
  const [query, setQuery] = useState('');
  const [placement, setPlacement] = useState('ALL');
  const admin = user.role === 'admin';
  const students = directory.students;
  const collegeOptions = collegeCodesForWorkspace(db);
  const placements = [...new Set(students.map(student => student.placementStatus || 'Unassigned'))];
  const filtered = useMemo(() => students.filter(student => {
    const text = `${student.name || ''} ${student.studentNumber || ''} ${student.program || ''} ${student.company || ''}`.toLowerCase();
    const status = student.enrollmentStatus || (student.college ? 'APPROVED' : 'PENDING_ONBOARDING');
    return text.includes(query.trim().toLowerCase()) &&
      (placement === 'ALL' || (student.placementStatus || 'Unassigned') === placement) &&
      (enrollmentFilter === 'ALL' || status === enrollmentFilter);
  }), [students, query, placement, enrollmentFilter]);
  const scopedCollege = admin && college !== 'ALL';
  const anyFilter = scopedCollege || Boolean(query) || placement !== 'ALL' || enrollmentFilter !== 'ALL';
  return <WorkspacePage title="Intern directory" subtitle={user.role === 'coordinator' ? 'Student records for your college.' : admin ? 'Student records across all colleges.' : undefined}>
    {notice}
    {!directory.available ? <p role="status">Student records are unavailable.</p> : <>
      {admin && collegeOptions.length > 0 && <Field label="College" options={[{ value: 'ALL', label: 'All colleges' }, ...collegeOptions.map(code => ({ value: code, label: `${code}${NEMSU_COLLEGES[code]?.name ? ` · ${NEMSU_COLLEGES[code].name}` : ''}` }))]} value={college} onChange={event => setCollege(event.target.value)} />}
      {(user.role === 'coordinator' || admin) && <SummaryMetrics className="intern-summary" ariaLabel="Cohort summary" items={[
        { label: 'Students in scope', value: students.length },
        { label: 'Deployed', value: students.filter(student => student.placementStatus === 'Approved & Deployed').length },
        { label: 'Placement preferences', value: students.filter(student => student.placementStatus === 'Pending Coordinator Endorsement').length }
      ]} />}
      <div className="intern-filters"><SearchField label="Search students" value={query} placeholder="Name, student number, program, or host" onChange={event => setQuery(event.target.value)} onClear={() => setQuery('')} /><Field label="Placement status" options={[{ value: 'ALL', label: 'All statuses' }, ...placements.map(value => ({ value, label: value }))]} value={placement} onChange={event => setPlacement(event.target.value)} /><Field label="Enrollment status" options={[{ value: 'ALL', label: 'All enrollments' }, { value: 'PENDING_APPROVAL', label: 'Pending approval' }, { value: 'APPROVED', label: 'Approved & enrolled' }, { value: 'REJECTED', label: 'Revision requested' }, { value: 'PENDING_ONBOARDING', label: 'Unregistered' }]} value={enrollmentFilter} onChange={event => setEnrollmentFilter(event.target.value)} /></div>
      <DataTable title="Student records" rows={filtered} emptyTitle={scopedCollege ? 'No students in this college' : anyFilter ? 'No students match' : 'No student records yet'} emptyDescription={scopedCollege ? 'Select a different college or adjust the search or placement filter.' : query || placement !== 'ALL' || enrollmentFilter !== 'ALL' ? 'Adjust the search or placement filter.' : 'Student records will appear here when available.'} emptyIcon={anyFilter ? 'search' : 'users'} search={false} columns={[{ key: 'name', label: 'Student' }, { key: 'studentNumber', label: 'Student number' }, { key: 'program', label: 'Program' }, ...(user.role !== 'coordinator' ? [{ key: 'college', label: 'College' }] : []), { key: 'enrollment', label: 'Enrollment', render: student => { const st = student.enrollmentStatus || (student.college ? 'APPROVED' : 'PENDING_ONBOARDING'); if (st === 'PENDING_APPROVAL') return <StatusBadge status="Pending Approval" tone="warning" />; if (st === 'APPROVED') return <StatusBadge status="Enrolled" tone="success" />; if (st === 'REJECTED') return <StatusBadge status="Revision" tone="danger" />; return <StatusBadge status="Unregistered" tone="neutral" />; } }, { key: 'company', label: 'Host company', render: student => student.company || 'Not assigned' }, { key: 'placementStatus', label: 'Placement', render: student => student.placementStatus || 'Not recorded' }, { key: 'hours', label: 'Credited hours', render: student => student.hoursAvailable ? (student.directoryHours == null ? 'Unavailable' : `${student.directoryHours}${student.directoryQuota == null ? ' hours' : ` / ${student.directoryQuota} hours`}`) : 'Unavailable' }, { key: 'clearance', label: 'Clearance', render: student => student.clearance || 'Not recorded' }, { key: 'actions', label: 'Actions', render: student => { const isPending = student.enrollmentStatus === 'PENDING_APPROVAL'; const evaluation = student.evaluationAvailable ? db.evaluations.find(item => item.studentId === student.id || (item.studentId == null && item.studentName === student.name)) : null; return <div className="intern-row-actions">{isPending && (user.role === 'coordinator' || admin) && <><Button size="sm" variant="primary" disabled={busy} onClick={async () => { await run(() => approveEnrollment(user, student.id), `Enrollment approved for ${student.name}.`); }}>Approve</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => { setRejecting(student); setRejectReason(''); }}>Reject</Button></>}<Button variant="secondary" onClick={() => setSelected({ student, evaluation, evaluationAvailable: student.evaluationAvailable })}>View details</Button>{evaluation && user.role !== 'supervisor' && student.clearance !== 'Cleared & Certified' && <Button onClick={() => setConfirm(student)}>Certify clearance</Button>}</div>; } }]} />
    </>}
    {selected && <Modal title={selected.student.name || 'Student details'} onClose={() => setSelected(null)}><div className="intern-detail space-y-3"><p>{selected.student.email || 'Email not recorded'} · {selected.student.program || 'Program not recorded'} · {selected.student.assignedRole || 'Role not recorded'}</p><p><strong>ID Number:</strong> {selected.student.studentNumber || 'Not recorded'} · <strong>College:</strong> {selected.student.college || 'Unassigned'} · <strong>Enrollment:</strong> {selected.student.enrollmentStatus || (selected.student.college ? 'APPROVED' : 'PENDING_ONBOARDING')}</p>{selected.student.rejectionReason && <p className="text-sm font-semibold text-danger">Revision note: {selected.student.rejectionReason}</p>}{selected.student.portfolioData?.bio && <p>{selected.student.portfolioData.bio}</p>}<p><strong>Skills:</strong> {(selected.student.portfolioData?.skills || []).join(', ') || 'Not recorded'}</p>{selected.student.enrollmentStatus === 'PENDING_APPROVAL' && (user.role === 'coordinator' || admin) && <div className="flex gap-2 pt-2 border-t border-line"><Button disabled={busy} variant="primary" onClick={async () => { if (await run(() => approveEnrollment(user, selected.student.id), `Enrollment approved for ${selected.student.name}.`)) setSelected(null); }}>Approve enrollment</Button><Button disabled={busy} variant="secondary" onClick={() => { setRejecting(selected.student); setRejectReason(''); setSelected(null); }}>Reject enrollment</Button></div>}{selected.evaluation ? <EvaluationDetails evaluation={selected.evaluation}/> : <p>{selected.evaluationAvailable ? 'No evaluation recorded.' : 'Evaluation records are unavailable.'}</p>}</div></Modal>}
    {rejecting && <Modal title={`Reject enrollment for ${rejecting.name}`} onClose={() => setRejecting(null)}><form onSubmit={async event => { event.preventDefault(); if (!rejectReason.trim()) return; if (await run(() => rejectEnrollment(user, rejecting.id, rejectReason.trim()), `Enrollment rejected for ${rejecting.name}.`)) setRejecting(null); }} className="space-y-4"><p className="text-sm text-ink leading-relaxed">State why this student's enrollment declaration cannot be approved (e.g. incorrect college, invalid student ID). The student will see this note and be prompted to resubmit.</p><Field label="Reason for revision / rejection" required multiline rows={3} value={rejectReason} onChange={event => setRejectReason(event.target.value)} placeholder="Enter instructions for the student…" /><div className="flex flex-wrap justify-end gap-2 pt-2"><Button variant="secondary" disabled={busy} onClick={() => setRejecting(null)}>Cancel</Button><Button variant="danger" type="submit" disabled={busy || !rejectReason.trim()}>{busy ? 'Rejecting…' : 'Confirm rejection'}</Button></div></form></Modal>}
    {confirm && <Modal title="Certify final OJT clearance?" onClose={() => setConfirm(null)}><p>Confirm that {confirm.name} has completed all {confirm.college} hours, checklist documents, and evaluation requirements. This is a human certification, not an automatic eligibility decision.</p><Button disabled={busy} onClick={async () => { if (await run(() => grantClearance(user, confirm.id))) setConfirm(null); }}>Certify clearance</Button>{notice}</Modal>}</WorkspacePage>;
}