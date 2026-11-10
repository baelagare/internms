import { useState } from 'react';
import { Button, StatusBadge } from '../components/ui.jsx';
import { DataTable, Field, Modal, WorkspacePage, useMutation } from '../components/workflow.jsx';
import { scopedStudents } from '../services/localRepository.js';
import { reviewSubmission } from '../services/applicationService.js';
import { taskStatusTone } from '../services/studentTaskLogs.js';

export function Approvals({ user, db, onChange }) {
  const [category, setCategory] = useState(user.role === 'supervisor' ? 'log' : 'document');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const { run, busy, notice } = useMutation(onChange);
  const students = scopedStudents(db, user);
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
      : (category === 'adjustment' ? db.dtrDisputes : db.logs)
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
  const canReview = row =>
    category === 'document' ? Boolean(row.fileName) : row.status === expected;

  return (
    <WorkspacePage title="Approval queues & history">
      {notice}
      <div className="grid gap-4 sm:grid-cols-2">
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
        title="Submissions"
        rows={records.filter(record => status === 'ALL' || record.status === status)}
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
                            'Review decision saved locally.'
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
