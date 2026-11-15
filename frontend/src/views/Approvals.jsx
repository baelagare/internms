import { useMemo, useState } from 'react';
import './approvals.css';
import { Button, Notice, StatusBadge, SummaryMetrics } from '../components/ui.jsx';
import { DataTable, Field, Modal, WorkspacePage, useMutation } from '../components/workflow.jsx';
import { scopedStudents } from '../services/records.js';
import { reviewSubmission } from '../services/applicationService.js';
import { taskStatusTone } from '../services/studentTaskLogs.js';

export function Approvals({ user, db, onChange }) {
  const [category, setCategory] = useState(user.role === 'supervisor' ? 'log' : 'document');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const { run, busy, notice } = useMutation(onChange);
  const safeDb = { ...db, logs: Array.isArray(db?.logs) ? db.logs : [], dtrDisputes: Array.isArray(db?.dtrDisputes) ? db.dtrDisputes : [], users: Array.isArray(db?.users) ? db.users : [] };
  const students = scopedStudents(safeDb, user);
  const scope = new Map(students.map(student => [student.id, student]));
  const documents = students.flatMap(student =>
    (student.preDeploymentDocs || []).map(document => ({
      ...document,
      id: `${student.id}:${document.id}`,
      documentId: document.id,
      studentId: student.id,
      student: student.name,
      description: `${document.issuer} · ${document.fileName || 'No file'}`,
      date: document.uploadedAt
    }))
  );
  const records =
    category === 'document'
      ? documents
      : (category === 'adjustment' ? safeDb.dtrDisputes : safeDb.logs)
          .filter(
            record =>
              scope.has(record.studentId) ||
              (!record.studentId && students.some(student => student.name === record.student))
          )
          .map(record => ({
            ...record,
            studentId:
              record.studentId || students.find(student => student.name === record.student)?.id,
            student: record.student || record.studentName,
            title: record.title || record.reason,
            date: record.date || record.targetDate,
            hours: record.hours || record.requestedHours
          }));
  const expected =
    user.role === 'supervisor' ? 'Pending Supervisor Verification' : 'Supervisor Verified';
  const canReview = row => category === 'document' ? Boolean(row.fileName) : row.status === expected;
  const visibleRecords = useMemo(() => records.filter(record => status === 'ALL' || record.status === status), [records, status]);
  const pendingRecords = records.filter(canReview);
  const pendingCount = pendingRecords.length;
  const approvedCount = records.filter(record => /approved|verified/i.test(record.status || '') && !canReview(record)).length;
  const returnedCount = records.filter(record => /returned|revision|rejected/i.test(record.status || '')).length;
  const isCoordinator = user.role === 'coordinator';
  const isHost = user.role === 'supervisor';

  return (
    <WorkspacePage title={isCoordinator ? 'Coordinator approvals' : isHost ? 'Company review queue' : 'Approval queues & history'} subtitle={isHost ? `Review submissions from interns assigned to ${user.company || 'your company'}.` : undefined}>
      {notice}
      {isHost && <>
        <Notice tone="info" title="Supervisor verification">Your review records verification only. Final OJT credit is decided by the college coordinator.</Notice>
        <SummaryMetrics className="approvals-summary" ariaLabel="Company review summary" items={[
          { label: 'Needs your review', value: pendingCount },
          { label: 'Verified', value: approvedCount },
          { label: 'Returned for changes', value: returnedCount }
        ]} />
      </>}
      {isCoordinator && <>
        <p className="approvals-intro">Review verified internship records for your college. Supervisor verification and coordinator approval are separate stages.</p>
        <SummaryMetrics className="approvals-summary" ariaLabel="Submission summary" items={[
          { label: 'Needs review', value: pendingCount },
          { label: 'Approved / verified', value: approvedCount },
          { label: 'Returned for changes', value: returnedCount }
        ]} />
      </>}
      {user.role === 'supervisor' && !Array.isArray(db?.logs) && !Array.isArray(db?.dtrDisputes) && <Notice tone="warning" title="Review records unavailable">Submission and attendance records are not connected.</Notice>}
      <div className="approvals-filters grid gap-4 sm:grid-cols-2">
        <Field
          label="Submission category"
          options={[
            ...(user.role !== 'supervisor'
              ? [{ value: 'document', label: 'Checklist documents' }]
              : []),
            { value: 'log', label: 'Attendance and weekly reports' },
            { value: 'adjustment', label: 'Attendance adjustments' }
          ]}
          value={category}
          onChange={event => {
            setCategory(event.target.value);
            setStatus('ALL');
          }}
        />
        <Field
          label="Status"
          options={['ALL', ...new Set(records.map(record => record.status))]}
          value={status}
          onChange={event => setStatus(event.target.value)}
        />
      </div>
      <DataTable
        title={isCoordinator ? 'Review records' : isHost ? 'Company submissions' : 'Submissions'}
        rows={visibleRecords}
        emptyTitle={isCoordinator ? 'No submissions in this view' : 'No submissions found'}
        emptyDescription={isCoordinator ? 'Records will appear here when they are available to your college.' : 'Try another category or status filter.'}
        columns={[
          { key: 'student', label: 'Student' },
          { key: 'date', label: 'Date' },
          { key: 'title', label: 'Requirement / summary' },
          { key: 'description', label: 'Details' },
          { key: 'hours', label: 'Hours' },
          {
            key: 'status',
            label: 'Status',
            render: row => <StatusBadge tone={taskStatusTone(row.status)}>{row.status}</StatusBadge>
          },
          { key: 'remarks', label: 'Remarks' },
          {
            key: 'actions',
            label: 'Actions',
            render: row => (
              <Button
                variant="secondary"
                onClick={() => {
                  setSelected(row);
                  setRemarks('');
                }}
              >
                {canReview(row) ? 'Review' : 'View details'}
              </Button>
            )
          }
        ]}
      />
      {selected && (
        <Modal title={`${selected.student} · Review submission`} onClose={() => setSelected(null)}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-bold text-slate-900">{selected.title}</h3>
              <StatusBadge tone={taskStatusTone(selected.status)}>{selected.status}</StatusBadge>
            </div>
            <p className="text-sm text-slate-700">{selected.description || selected.reason}</p>
            <p className="text-xs font-semibold text-slate-600">
              {selected.date}
              {selected.weekNumber ? ` · Week ${selected.weekNumber}` : ''}
              {selected.hours ? ` · ${selected.hours} hours reported` : ''}
              {selected.dtrReferenceHours != null
                ? ` (${selected.dtrReferenceHours} hrs Week DTR reference)`
                : ''}
            </p>
            {selected.competencyTag && (
              <p className="text-xs font-semibold text-blue-900">
                Competency Outcome: {selected.competencyTag}
              </p>
            )}
            {(selected.supervisorVerifiedBy || selected.coordinatorApprovedBy) && (
              <p className="text-xs text-slate-600">
                {selected.supervisorVerifiedBy
                  ? `Supervisor Verified: ${selected.supervisorVerifiedBy}`
                  : ''}
                {selected.supervisorVerifiedBy && selected.coordinatorApprovedBy ? ' · ' : ''}
                {selected.coordinatorApprovedBy
                  ? `Coordinator Approved: ${selected.coordinatorApprovedBy}`
                  : ''}
              </p>
            )}
            {selected.photo && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                <p className="text-xs font-bold text-slate-700">
                  Captured Camera Evidence ({selected.evidenceSource === 'live_camera' ? 'Live WebRTC Snapshot' : 'Timestamped Capture'})
                </p>
                <img
                  src={selected.photo}
                  alt={`Task evidence for ${selected.title}`}
                  className="max-h-64 w-full rounded-md border border-slate-300 bg-slate-900 object-contain"
                />
              </div>
            )}
            {(selected.remarks || selected.supervisorRemarks) && (
              <p className="text-xs text-slate-700">
                <strong>Review Remarks:</strong> {selected.remarks || selected.supervisorRemarks}
              </p>
            )}
            {selected.fileName && (
              <p className="text-xs text-slate-500">
                Metadata only: {selected.fileName}. Original document bytes are not stored.
              </p>
            )}
            {canReview(selected) && (
              <>
                <Field
                  label="Remarks / revision instructions"
                  multiline
                  value={remarks}
                  onChange={event => setRemarks(event.target.value)}
                />
                <div className="flex flex-wrap gap-3">
                  {[true, false].map(approve => (
                    <Button
                      key={String(approve)}
                      variant={approve ? 'primary' : 'danger'}
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await run(
                            () =>
                              reviewSubmission(
                                user,
                                category,
                                selected.documentId || selected.id,
                                selected.studentId,
                                approve,
                                remarks
                              ),
                            'Review decision saved.'
                          )
                        )
                          setSelected(null);
                      }}
                    >
                      {approve
                        ? user.role === 'supervisor' || category === 'document'
                          ? 'Verify'
                          : 'Approve & credit'
                        : 'Return for revision'}
                    </Button>
                  ))}
                </div>
              </>
            )}
            {notice}
          </div>
        </Modal>
      )}
    </WorkspacePage>
  );
}
