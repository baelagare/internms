import { useEffect, useMemo, useRef, useState } from 'react';
import './approvals.css';
import { Button, Notice, StatusBadge, SummaryMetrics } from '../components/ui.jsx';
import { DataTable, Field, Modal, WorkspacePage, useMutation } from '../components/workflow.jsx';
import { scopedStudents } from '../services/records.js';
import { reviewSubmission } from '../services/applicationService.js';
import { taskStatusTone } from '../services/studentTaskLogs.js';
import { getApiBaseUrl, fetchAttendancePhoto } from '../services/apiClient.js';

const PUNCH_TYPES = ['am_in', 'am_out', 'pm_in', 'pm_out'];
const PUNCH_LABELS = { am_in: 'AM In', am_out: 'AM Out', pm_in: 'PM In', pm_out: 'PM Out' };
const PUNCH_TIME_FIELDS = { am_in: 'amIn', am_out: 'amOut', pm_in: 'pmIn', pm_out: 'pmOut' };
const PUNCH_PHOTO_FIELDS = { am_in: 'amInPhoto', am_out: 'amOutPhoto', pm_in: 'pmInPhoto', pm_out: 'pmOutPhoto' };

export function Approvals({ user, db, onChange, initialQuery }) {
  const defaultCategory = initialQuery?.category || (user.role === 'supervisor' ? 'log' : 'document');
  const [category, setCategory] = useState(defaultCategory);
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [punchPhotos, setPunchPhotos] = useState({});
  const [punchPhotoLoading, setPunchPhotoLoading] = useState(false);
  const [punchPhotoMissing, setPunchPhotoMissing] = useState({});
  const initialHandled = useRef(false);
  const photoUrlsRef = useRef([]);
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

  useEffect(() => {
    if (initialHandled.current) return;
    if (initialQuery?.id || initialQuery?.targetId || initialQuery?.studentId || initialQuery?.student) {
      const match = records.find(r =>
        (initialQuery.id && String(r.id) === String(initialQuery.id)) ||
        (initialQuery.targetId && String(r.id) === String(initialQuery.targetId)) ||
        (initialQuery.studentId && String(r.studentId) === String(initialQuery.studentId)) ||
        (initialQuery.student && r.student === initialQuery.student)
      );
      if (match) {
        setSelected(match);
        setRemarks('');
        initialHandled.current = true;
      }
    }
  }, [initialQuery, records]);

  // Load captured punch photos for the selected DTR record.
  useEffect(() => {
    photoUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    photoUrlsRef.current = [];
    setPunchPhotos({});
    setPunchPhotoMissing({});
    setPunchPhotoLoading(false);
    if (!selected || selected.kind !== 'attendance' || !selected.apiId) return undefined;
    const available = PUNCH_TYPES.filter(type => selected[PUNCH_PHOTO_FIELDS[type]]);
    if (available.length === 0) return undefined;
    let cancelled = false;
    setPunchPhotoLoading(true);
    (async () => {
      for (const type of available) {
        try {
          const url = await fetchAttendancePhoto(selected.apiId, type);
          photoUrlsRef.current.push(url);
          if (cancelled) { URL.revokeObjectURL(url); return; }
          setPunchPhotos(prev => ({ ...prev, [type]: url }));
        } catch {
          if (!cancelled) setPunchPhotoMissing(prev => ({ ...prev, [type]: true }));
        }
      }
      if (!cancelled) setPunchPhotoLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selected]);
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
    <WorkspacePage title={isCoordinator ? 'Coordinator Approvals' : isHost ? 'Company Review Queue' : 'Approval Queues & History'} subtitle={isHost ? `Review submissions from interns assigned to ${user.company || 'your company'}.` : undefined}>
      {notice}
      {isHost && <>
        <Notice tone="info" title="Supervisor Verification">Your review records verification only. Final OJT credit is decided by the college coordinator.</Notice>
        <SummaryMetrics className="approvals-summary" ariaLabel="Company review summary" items={[
          { label: 'Needs Your Review', value: pendingCount },
          { label: 'Verified', value: approvedCount },
          { label: 'Returned For Changes', value: returnedCount }
        ]} />
      </>}
      {isCoordinator && <>
        <p className="approvals-intro">Review verified internship records for your college. Supervisor verification and coordinator approval are separate stages.</p>
        <SummaryMetrics className="approvals-summary" ariaLabel="Submission summary" items={[
          { label: 'Needs Review', value: pendingCount },
          { label: 'Approved / Verified', value: approvedCount },
          { label: 'Returned For Changes', value: returnedCount }
        ]} />
      </>}
      {user.role === 'supervisor' && !Array.isArray(db?.logs) && !Array.isArray(db?.dtrDisputes) && <Notice tone="warning" title="Review records unavailable">Submission and attendance records are not connected.</Notice>}
      <div className="approvals-filters grid gap-4 sm:grid-cols-2">
        <Field
          label="Submission Category"
          options={[
            ...(user.role !== 'supervisor'
              ? [{ value: 'document', label: 'Checklist Documents' }]
              : []),
            { value: 'log', label: 'Attendance & Weekly Reports' },
            { value: 'adjustment', label: 'Attendance Adjustments' }
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
        title={isCoordinator ? 'Review Records' : isHost ? 'Company Submissions' : 'Submissions'}
        rows={visibleRecords}
        emptyTitle={isCoordinator ? 'No Submissions In This View' : 'No Submissions Found'}
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
                {canReview(row) ? 'Review' : 'View Details'}
              </Button>
            )
          }
        ]}
      />
      {selected && (
        <Modal title={`${selected.student} · Review Submission`} onClose={() => setSelected(null)}>
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
            {selected.kind === 'attendance' && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                <p className="text-xs font-bold text-slate-700">Daily punch record</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PUNCH_TYPES.map(type => (
                    <div key={type} className="rounded-md border border-slate-200 bg-white p-2 text-xs">
                      <span className="block font-semibold text-slate-600">{PUNCH_LABELS[type]}</span>
                      <span className="tabular-nums font-bold text-slate-900">{selected[PUNCH_TIME_FIELDS[type]] || '—'}</span>
                    </div>
                  ))}
                </div>
                {PUNCH_TYPES.filter(type => selected[PUNCH_PHOTO_FIELDS[type]]).map(type => (
                  <figure key={type} className="space-y-1">
                    <figcaption className="text-xs font-semibold text-slate-600">{PUNCH_LABELS[type]} camera evidence</figcaption>
                    {punchPhotos[type]
                      ? <img src={punchPhotos[type]} alt={`${selected.student} ${PUNCH_LABELS[type]} punch verification photo`} width="640" height="480" className="max-h-56 w-full rounded-md border border-slate-300 bg-slate-900 object-contain" />
                      : punchPhotoMissing[type]
                        ? <p className="text-xs text-slate-500">Photo unavailable. The record still shows its recorded punch times.</p>
                        : <p className="text-xs text-slate-500">Loading photo…</p>}
                  </figure>
                ))}
                {PUNCH_TYPES.every(type => !selected[PUNCH_PHOTO_FIELDS[type]]) && (
                  <p className="text-xs text-slate-500">No camera photos were captured for this record.</p>
                )}
              </div>
            )}
            {(selected.supervisorNotes || selected.coordinatorNotes) && (
              <div className="space-y-1 text-xs text-slate-600">
                {selected.supervisorNotes && <p><strong>Supervisor remarks:</strong> {selected.supervisorNotes}</p>}
                {selected.coordinatorNotes && <p><strong>Coordinator remarks:</strong> {selected.coordinatorNotes}</p>}
              </div>
            )}
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
            {category === 'document' && selected.fileName && selected.documentId && (
              <a className="inline-flex font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" href={`${getApiBaseUrl()}/documents/${selected.documentId}/download`} target="_blank" rel="noreferrer">
                Download Submitted Document
              </a>
            )}
            {category === 'document' && selected.fileName && !selected.documentId && (
              <p className="text-xs text-slate-500">Original document bytes are unavailable.</p>
            )}
            {canReview(selected) && (
              <>
                <Field
                  label="Remarks / Revision Instructions"
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
                          : 'Approve & Credit'
                        : 'Return for Revision'}
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
