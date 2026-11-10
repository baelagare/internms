import { Fragment, useEffect, useId, useRef, useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  HelpTip,
  Metric,
  PageHeader,
  ProgressBar,
  SectionHeading,
  StatusBadge,
  Tabs
} from '../components/ui.jsx';
import { Icon } from '../components/Icons.jsx';
import {
  DataTable,
  Field,
  Modal,
  SearchField,
  WorkspacePage,
  useMutation
} from '../components/workflow.jsx';
import { createTrainingSubmission, submitWeeklyTaskReport } from '../services/applicationService.js';
import { approvedHours, studentLogs } from '../services/training.js';
import { formatDateDisplay, formatTime12 } from '../services/studentAttendance.js';
import {
  filterTaskLogs,
  formatLogRecordType,
  getCompetencyOptionsForCollege,
  getDefaultNarrativeTemplate,
  getTaskLogsModuleOverview,
  getVerificationChainDetails,
  getWeekTaskSummary,
  loadNarrativeDraft,
  paginateTaskLogs,
  saveNarrativeDraft,
  summarizeTaskLogs,
  taskStatusTone,
  validateWeeklyTaskReport
} from '../services/studentTaskLogs.js';
import { StudentAttendance } from './StudentAttendance.jsx';

export const logColumns = [
  { key: 'date', label: 'Date' },
  { key: 'weekNumber', label: 'Week' },
  { key: 'title', label: 'Accomplishment' },
  { key: 'description', label: 'Summary' },
  { key: 'competencyTag', label: 'Competency' },
  { key: 'hours', label: 'Hours' },
  { key: 'status', label: 'Status' },
  { key: 'remarks', label: 'Remarks' }
];

export function Training({ user, db, onChange, route }) {
  if (route === 'attendance' && user.role === 'student') {
    return <StudentAttendance user={user} db={db} onChange={onChange} />;
  }
  if (route !== 'attendance' && user.role === 'student') {
    return <StudentTaskLogs user={user} db={db} onChange={onChange} />;
  }

  const attendance = route === 'attendance';
  const [adjustment, setAdjustment] = useState(false);
  const [preview, setPreview] = useState(false);
  const [values, setValues] = useState({
    date: new Date().toISOString().slice(0, 10),
    punchType: 'FULL_DAY',
    title: '',
    description: '',
    weekNumber: 7,
    hours: 40,
    competencyTag:
      user.college === 'CITE'
        ? 'CS-PO3: Design, Implement & Evaluate Computing Systems'
        : 'Program Core Competency Outcome',
    targetDate: new Date().toISOString().slice(0, 10),
    requestedHours: 8,
    reason: '',
    attachmentName: ''
  });
  const [intro, setIntro] = useState(
    `Completed On-the-Job Training at ${user.company || 'Partner HTE'} as ${
      user.assignedRole || 'Student Intern'
    }, applying ${user.program} competencies to real-world deliverables.`
  );
  const [reflection, setReflection] = useState(
    `Throughout the internship period, I strengthened my proficiency in ${(
      user.portfolioData?.skills || []
    )
      .slice(0, 4)
      .join(', ')} while collaborating with industry mentors.`
  );

  const { run, busy, notice } = useMutation(onChange);
  const field = key => ({
    value: values[key],
    onChange: event => setValues(previous => ({ ...previous, [key]: event.target.value }))
  });
  const logs = studentLogs(db, user);
  const disputes = (db.dtrDisputes || []).filter(item => item.studentId === user.id);

  const submit = async (event, kind) => {
    event.preventDefault();
    if (
      await run(
        () => createTrainingSubmission(user, kind, values),
        'Submission saved locally for supervisor verification.'
      )
    ) {
      setAdjustment(false);
      setValues(previous => ({
        ...previous,
        title: '',
        description: '',
        reason: '',
        attachmentName: ''
      }));
    }
  };

  return (
    <WorkspacePage title={attendance ? 'Attendance & adjustments' : 'Weekly reports & narrative'}>
      {notice}
      {attendance && (
        <p className="font-bold">
          Verified / approved hours: {approvedHours(db, user)} /{' '}
          {db.collegeSettings?.[user.college]?.requiredHours || 324}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {attendance ? (
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Log attendance</h2>
            <form className="space-y-4" onSubmit={event => submit(event, 'attendance')}>
              <Field label="Attendance date" type="date" required {...field('date')} />
              <Field
                label="Shift"
                options={[
                  { value: 'FULL_DAY', label: 'Full day · 08:00–12:00 / 13:00–17:00 · 8 hours' },
                  { value: 'AM_SESSION', label: 'Morning · 08:00–12:00 · 4 hours' },
                  { value: 'PM_SESSION', label: 'Afternoon · 13:00–17:00 · 4 hours' }
                ]}
                {...field('punchType')}
              />
              <Field label="Work summary" required {...field('title')} />
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Log attendance locally'}
              </Button>
            </form>
          </Card>
        ) : (
          <WeeklyTaskReportCard user={user} db={db} onChange={onChange} />
        )}

        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold">
            {attendance ? 'CSC Form 48 & adjustments' : 'Narrative report'}
          </h2>
          {attendance ? (
            <>
              <Button variant="secondary" onClick={() => setAdjustment(true)}>
                Request adjustment
              </Button>
              <p className="text-sm">
                Requests pass through supervisor verification and coordinator approval before hours
                are credited.
              </p>
            </>
          ) : (
            <>
              <Field
                label="I. Host company & training overview"
                multiline
                value={intro}
                onChange={event => setIntro(event.target.value)}
              />
              <Field
                label="II. Key learnings & reflections"
                multiline
                value={reflection}
                onChange={event => setReflection(event.target.value)}
              />
              <p className="text-sm text-slate-500">
                Narrative text is composed for preview and print, as in the legacy application; it
                is not a separate submitted report record.
              </p>
            </>
          )}
          <Button variant="secondary" onClick={() => setPreview(true)}>
            Preview &amp; print {attendance ? 'Form 48' : 'narrative'}
          </Button>
        </Card>
      </div>

      {attendance && (
        <DataTable
          title="Adjustment request history"
          rows={disputes}
          columns={[
            { key: 'targetDate', label: 'Date' },
            { key: 'requestedHours', label: 'Requested hours' },
            { key: 'reason', label: 'Reason' },
            { key: 'attachmentName', label: 'Attachment metadata' },
            { key: 'status', label: 'Status' },
            { key: 'supervisorRemarks', label: 'Supervisor remarks' },
            { key: 'remarks', label: 'Review remarks' }
          ]}
        />
      )}

      {attendance ? (
        <DataTable
          title="Attendance history"
          rows={logs}
          columns={[
            logColumns[0],
            ...['amIn', 'amOut', 'pmIn', 'pmOut'].map(key => ({
              key,
              label: key.replace(/([A-Z])/g, ' $1').toUpperCase()
            })),
            ...logColumns.slice(2)
          ]}
        />
      ) : (
        <SubmittedTaskLogsCard logs={logs} />
      )}

      {adjustment && (
        <Modal title="Request attendance adjustment" onClose={() => setAdjustment(false)}>
          <form className="space-y-4" onSubmit={event => submit(event, 'adjustment')}>
            <Field label="Date" type="date" required {...field('targetDate')} />
            <Field
              label="Hours requested"
              type="number"
              min={1}
              max={12}
              required
              {...field('requestedHours')}
            />
            <Field label="Reason" multiline required {...field('reason')} />
            <Button type="submit" disabled={busy}>
              Submit request locally
            </Button>
            {notice}
          </form>
        </Modal>
      )}

      {preview && (
        <Modal
          title={
            attendance
              ? 'Civil Service Form No. 48 · Daily Time Record'
              : `OJT Narrative Report · ${user.name}`
          }
          onClose={() => setPreview(false)}
        >
          <div className="print-report">
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p>
              {user.program} · {user.college} · {user.company}
            </p>
            {!attendance && (
              <>
                <h3 className="mt-4 font-bold">I. Host company &amp; training overview</h3>
                <p className="whitespace-pre-wrap">{intro}</p>
                <h3 className="mt-4 font-bold">II. Key learnings &amp; reflections</h3>
                <p className="whitespace-pre-wrap">{reflection}</p>
              </>
            )}
            <table className="my-4 w-full text-left text-sm">
              <thead>
                <tr>
                  {(attendance
                    ? ['Date', 'AM in', 'AM out', 'PM in', 'PM out', 'Hours', 'Status']
                    : ['Date', 'Accomplishment', 'Summary', 'Hours', 'Status']
                  ).map(label => (
                    <th key={label} className="border p-2">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    {(attendance
                      ? [
                          log.date,
                          log.amIn || '—',
                          log.amOut || '—',
                          log.pmIn || '—',
                          log.pmOut || '—',
                          log.hours,
                          log.status
                        ]
                      : [log.date, log.title, log.description, log.hours, log.status]
                    ).map((value, index) => (
                      <td key={index} className="border p-2">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {attendance && (
              <p>
                Student signature: __________________ · Supervisor / coordinator certification:
                __________________
              </p>
            )}
          </div>
          <Button className="print:hidden" onClick={() => window.print()}>
            Print report
          </Button>
        </Modal>
      )}
    </WorkspacePage>
  );
}

/**
 * Derives a sensible default week number from existing student logs without inventing "Week 7".
 */
function deriveInitialWeek(db, user) {
  const logs = studentLogs(db, user);
  const weeklyLogs = logs.filter(item => item.kind === 'weekly_task');
  const returned = weeklyLogs.find(item => /returned|revision/i.test(item.status || ''));
  if (returned && Number(returned.weekNumber) >= 1) {
    return Number(returned.weekNumber);
  }
  const activeWeeks = new Set(
    weeklyLogs
      .filter(item => !/returned|revision|rejected/i.test(item.status || ''))
      .map(item => Number(item.weekNumber))
      .filter(Boolean)
  );
  const maxLoggedWeek = logs.reduce((max, item) => Math.max(max, Number(item.weekNumber) || 0), 0);
  if (maxLoggedWeek > 0) {
    if (!activeWeeks.has(maxLoggedWeek)) return Math.min(16, maxLoggedWeek);
    return Math.min(16, maxLoggedWeek + 1);
  }
  return 1;
}

/**
 * Component 4: Dedicated Student Task Logs & Narrative Report View
 */
export function StudentTaskLogs({ user, db, onChange }) {
  const id = useId();
  const [activeTab, setActiveTab] = useState('reports');
  const logs = studentLogs(db, user);
  const overview = getTaskLogsModuleOverview(db, user);

  return (
    <div className="student-task-logs space-y-6">
      <PageHeader
        title="Task Logs & Narrative"
        subtitle={`${overview.company} · ${overview.assignedRole}`}
        badge={
          <StatusBadge
            tone={
              overview.returnedRevisionCount > 0
                ? 'danger'
                : overview.pendingReviewCount > 0
                ? 'warning'
                : 'success'
            }
          >
            {overview.returnedRevisionCount > 0
              ? `${overview.returnedRevisionCount} needs changes`
              : overview.pendingReviewCount > 0
              ? `${overview.pendingReviewCount} waiting for review`
              : `${overview.weeklyReportsVerified} approved`}
          </StatusBadge>
        }
        action={
          <Button
            variant="secondary"
            onClick={() => setActiveTab(activeTab === 'narrative' ? 'reports' : 'narrative')}
          >
            <Icon name={activeTab === 'narrative' ? 'clipboard' : 'printer'} size={16} />
            {activeTab === 'narrative' ? 'Back to weekly reports' : 'Narrative report'}
          </Button>
        }
      />

      {/* Compact 4-Column Summary Strip */}
      <Card className="p-5" aria-labelledby={`${id}-overview-heading`}>
        <h2 id={`${id}-overview-heading`} className="sr-only">
          Task progress summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-b border-slate-200 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Approved hours
              </p>
              <StatusBadge tone="success">Approved</StatusBadge>
            </div>
            <p className="mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums text-navy-950">
              {overview.approvedOjtHours}{' '}
              <span className="text-sm font-semibold text-slate-500">
                / {overview.requiredQuota} hrs
              </span>
            </p>
            <div className="mt-2 space-y-1">
              <ProgressBar
                label="Approved OJT hours progress"
                value={overview.approvedOjtHours}
                max={overview.requiredQuota}
              />
              <p className="text-xs text-slate-600">
                {overview.quotaPercent}% of required hours
              </p>
            </div>
          </div>

          <Metric
            label="Weekly reports"
            value={`${overview.weeklyReportsSubmitted}`}
            badge={<StatusBadge tone="blue">{overview.weeklyReportsVerified} approved</StatusBadge>}
            detail={`Across ${overview.distinctWeeksLogged} ${
              overview.distinctWeeksLogged === 1 ? 'week' : 'weeks'
            }`}
          />

          <Metric
            label="Skill areas"
            value={`${overview.distinctCompetenciesCount}`}
            detail={`${user.college || 'CITE'} competencies covered`}
          />

          <Metric
            label="Waiting for review"
            value={`${overview.pendingReviewHours} hrs`}
            badge={
              overview.returnedRevisionCount > 0 ? (
                <StatusBadge tone="danger">
                  {overview.returnedRevisionCount} needs changes
                </StatusBadge>
              ) : (
                <StatusBadge tone="warning">
                  {overview.pendingReviewCount} waiting
                </StatusBadge>
              )
            }
            detail="Counts after supervisor & coordinator approval"
          />
        </div>
      </Card>

      {/* Workspace Switcher */}
      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: 'reports',
            label: 'Weekly Reports',
            count: overview.weeklyReportsSubmitted
          },
          {
            id: 'narrative',
            label: 'Narrative Report'
          }
        ]}
      />

      {activeTab === 'reports' ? (
        <div className="space-y-6">
          <WeeklyTaskReportCard user={user} db={db} onChange={onChange} />
          <SubmittedTaskLogsCard logs={logs} />
        </div>
      ) : (
        <NarrativeReportCard user={user} db={db} logs={logs} />
      )}
    </div>
  );
}

/**
 * Component 1: Weekly Task Report and Live Camera Evidence Workflow
 */
export function WeeklyTaskReportCard({ user, db, onChange }) {
  const id = useId();
  const competencyPresets = getCompetencyOptionsForCollege(user.college);
  const initialWeek = deriveInitialWeek(db, user);
  const initialSummary = getWeekTaskSummary(db, user, initialWeek);

  const [weekNumber, setWeekNumber] = useState(initialWeek);
  const [hours, setHours] = useState(
    initialSummary.dtrRecordedHours > 0 ? initialSummary.dtrRecordedHours : ''
  );
  const [selectedCompetency, setSelectedCompetency] = useState(
    competencyPresets[2] || competencyPresets[0]
  );
  const [customCompetency, setCustomCompetency] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Live Camera Evidence states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState(null);
  const [capturedAtIso, setCapturedAtIso] = useState(null);
  const [capturedTimeLabel, setCapturedTimeLabel] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const formRef = useRef(null);

  const { run, busy, notice } = useMutation(onChange);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const weekSummary = getWeekTaskSummary(db, user, weekNumber);
  const effectiveCompetency =
    selectedCompetency === '__CUSTOM__' ? customCompetency.trim() : selectedCompetency;

  const validationErrors = validateWeeklyTaskReport({
    weekNumber,
    hours,
    competencyTag: effectiveCompetency,
    title,
    description,
    snapshot: capturedSnapshot
  });

  async function startCamera() {
    setCameraError(null);
    setCameraLoading(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraLoading(false);
      setCameraError('This browser cannot access the camera. Try Chrome or Safari.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setCameraLoading(false);
      return true;
    } catch (err) {
      setCameraLoading(false);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera is blocked. Allow camera access in your browser settings, then try again.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Connect a camera or use your phone.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Your camera is being used by another app. Close other video apps and retry.');
      } else {
        setCameraError('Could not start your camera. Check your device settings and try again.');
      }
      return false;
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  }

  function handleCaptureSnapshot() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const now = new Date();
    setCapturedSnapshot(dataUrl);
    setCapturedAtIso(now.toISOString());
    setCapturedTimeLabel(`${now.toISOString().slice(0, 10)} · ${formatTime12(now)}`);
    stopCamera();
  }

  async function handleRetakePhoto() {
    setCapturedSnapshot(null);
    setCapturedAtIso(null);
    setCapturedTimeLabel('');
    await startCamera();
  }

  function handleClearCapture() {
    setCapturedSnapshot(null);
    setCapturedAtIso(null);
    setCapturedTimeLabel('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTriedSubmit(true);
    setStatusMessage('');

    if (Object.keys(validationErrors).length > 0) {
      const firstInvalid = formRef.current?.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus?.();
      return;
    }

    const submittedWeek = Number(weekNumber);
    const submittedTitle = title.trim();

    const ok = await run(
      () =>
        submitWeeklyTaskReport(user, {
          weekNumber: submittedWeek,
          hours: Number(hours),
          competencyTag: effectiveCompetency,
          title: submittedTitle,
          description: description.trim(),
          snapshot: capturedSnapshot,
          capturedAt: capturedAtIso
        }),
      `Week ${submittedWeek} report ("${submittedTitle}") sent for supervisor review.`
    );

    if (ok) {
      stopCamera();
      setTriedSubmit(false);
      setTitle('');
      setDescription('');
      setCapturedSnapshot(null);
      setCapturedAtIso(null);
      setCapturedTimeLabel('');
      setStatusMessage(
        `Week ${submittedWeek} report sent for review. Your ${hours} hours will count once your supervisor and coordinator approve.`
      );
    }
  }

  const hasDuplicateActiveWeek = Boolean(weekSummary.existingActiveReport);

  return (
    <Card
      className="border-l-4 border-l-gold-500 p-5 space-y-5"
      aria-labelledby={`${id}-report-heading`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={`${id}-report-heading`} className="text-lg font-bold text-slate-900">
            Submit weekly report
          </h2>
          <p className="text-sm text-slate-600">
            Summarize your work for the week and take a quick photo of your workspace or output.
          </p>
        </div>
        <StatusBadge
          tone={capturedSnapshot ? 'success' : cameraActive ? 'blue' : 'neutral'}
        >
          {capturedSnapshot
            ? 'Photo ready'
            : cameraActive
            ? 'Camera on'
            : 'Photo required'}
        </StatusBadge>
      </div>

      {/* Duplicate Week or Revision Alert */}
      {weekSummary.existingActiveReport && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950"
        >
          <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <strong>Week {weekNumber} already submitted:</strong> &ldquo;
            {weekSummary.existingActiveReport.title}&rdquo; ({weekSummary.existingActiveReport.hours}{' '}
            hrs) is currently{' '}
            <strong>
              {weekSummary.existingActiveReport.status === 'Pending Supervisor Verification'
                ? 'waiting for review'
                : weekSummary.existingActiveReport.status}
            </strong>
            . Choose another week above.
          </div>
        </div>
      )}

      {!weekSummary.existingActiveReport && weekSummary.returnedReport && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-900"
        >
          <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-red-700" />
          <div>
            <strong>Week {weekNumber} needs changes:</strong>{' '}
            {weekSummary.returnedReport.remarks ||
              'Update your summary and take a new photo to resubmit.'}
          </div>
        </div>
      )}

      {statusMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900"
        >
          {statusMessage}
        </div>
      )}
      {notice}

      <form
        ref={formRef}
        className="space-y-4"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={busy}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Week"
            required
            value={weekNumber}
            onChange={event => {
              const nextWeek = Number(event.target.value);
              setWeekNumber(nextWeek);
              const summary = getWeekTaskSummary(db, user, nextWeek);
              if (summary.dtrRecordedHours > 0) {
                setHours(summary.dtrRecordedHours);
              }
            }}
            disabled={busy}
            error={triedSubmit ? validationErrors.weekNumber : ''}
            hint={`Week ${weekNumber} DTR has ${weekSummary.dtrRecordedHours} hrs logged (${weekSummary.dtrDaysCount} ${
              weekSummary.dtrDaysCount === 1 ? 'day' : 'days'
            }).`}
            options={Array.from({ length: 16 }, (_, idx) => {
              const wk = idx + 1;
              const wkSummary = getWeekTaskSummary(db, user, wk);
              const statusSuffix = wkSummary.existingActiveReport
                ? ' · Submitted'
                : wkSummary.returnedReport
                ? ' · Needs changes'
                : wkSummary.dtrRecordedHours > 0
                ? ` · ${wkSummary.dtrRecordedHours} DTR hrs`
                : '';
              return {
                value: wk,
                label: `Week ${wk}${statusSuffix}`
              };
            })}
          />

          <div className="space-y-1.5">
            <Field
              label="Hours worked this week (1–60)"
              type="number"
              min={1}
              max={60}
              required
              placeholder="e.g. 40"
              value={hours}
              onChange={event => setHours(event.target.value)}
              disabled={busy}
              error={triedSubmit ? validationErrors.hours : ''}
              hint="Counts toward your total once approved."
            />
            {weekSummary.dtrRecordedHours > 0 &&
              Number(hours) !== weekSummary.dtrRecordedHours && (
                <button
                  type="button"
                  className="text-xs font-bold text-navy-700 underline underline-offset-2 hover:text-navy-900"
                  onClick={() => setHours(weekSummary.dtrRecordedHours)}
                  disabled={busy}
                >
                  Use Week {weekNumber} DTR hours ({weekSummary.dtrRecordedHours} hrs)
                </button>
              )}
          </div>
        </div>

        {/* Skill Area / Competency */}
        <div className="space-y-3">
          <Field
            label={`Skill area (${user.college || 'CITE'})`}
            required
            value={selectedCompetency}
            onChange={event => setSelectedCompetency(event.target.value)}
            disabled={busy}
            error={
              triedSubmit && selectedCompetency !== '__CUSTOM__'
                ? validationErrors.competencyTag
                : ''
            }
            options={[
              ...competencyPresets.map(option => ({ value: option, label: option })),
              { value: '__CUSTOM__', label: 'Other skill area…' }
            ]}
          />

          {selectedCompetency === '__CUSTOM__' && (
            <Field
              label="Custom skill area"
              required
              placeholder="e.g. Software Testing & Quality Assurance"
              value={customCompetency}
              onChange={event => setCustomCompetency(event.target.value)}
              disabled={busy}
              error={triedSubmit ? validationErrors.competencyTag : ''}
            />
          )}
        </div>

        {/* Title */}
        <Field
          label="Report title"
          type="text"
          required
          placeholder="e.g. Week 7: API Validation & Testing"
          value={title}
          onChange={event => setTitle(event.target.value)}
          disabled={busy}
          error={triedSubmit ? validationErrors.title : ''}
        />

        {/* Summary */}
        <Field
          label="What did you accomplish?"
          multiline
          rows={4}
          required
          placeholder="Describe the tasks you finished, tools you used, and outputs you delivered this week (at least 15 characters)…"
          value={description}
          onChange={event => setDescription(event.target.value)}
          disabled={busy}
          error={triedSubmit ? validationErrors.description : ''}
          hint={`${description.trim().length} characters (minimum 15)`}
        />

        {/* Live Camera Evidence Capture */}
        <div
          className={`rounded-xl border p-4 space-y-4 ${
            triedSubmit && validationErrors.snapshot
              ? 'border-red-300 bg-red-50/40'
              : 'border-slate-200 bg-slate-50'
          }`}
          role="group"
          aria-labelledby={`${id}-camera-heading`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon name="camera" size={18} className="text-navy-800" />
              <span id={`${id}-camera-heading`} className="text-sm font-bold text-slate-900">
                Live work photo <span className="text-red-600">*</span>
              </span>
            </div>
            <HelpTip label="Why a live photo?">
              Weekly reports require a live photo from your camera so your supervisor can verify
              your work. Saved files cannot be uploaded here.
            </HelpTip>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-center">
            <div className="relative flex aspect-[4/3] max-h-[280px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-navy-800 bg-navy-950 text-white">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover [transform:scaleX(-1)]"
                style={{ display: cameraActive && !capturedSnapshot ? 'block' : 'none' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {capturedSnapshot && (
                <>
                  <img
                    src={capturedSnapshot}
                    alt="Captured live camera evidence for weekly task report"
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-900/90 px-2.5 py-1 text-xs font-bold text-white">
                      <Icon name="check" size={13} />
                      Photo captured
                    </span>
                    <span className="rounded-md bg-slate-950/75 px-2.5 py-1 text-xs font-semibold text-white">
                      {capturedTimeLabel}
                    </span>
                  </div>
                </>
              )}

              {cameraActive && !capturedSnapshot && (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
                  <span className="rounded-md bg-slate-950/75 px-2.5 py-1 text-xs font-bold text-white">
                    Camera ready
                  </span>
                </div>
              )}

              {!cameraActive && !cameraLoading && !cameraError && !capturedSnapshot && (
                <div className="max-w-xs space-y-3 p-5 text-center">
                  <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white/10 text-navy-100">
                    <Icon name="camera" size={22} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Take a photo of your work</h3>
                    <p className="text-xs text-slate-300">
                      Turn on your camera and snap a photo of your workstation or output.
                    </p>
                  </div>
                  <Button type="button" variant="secondary" onClick={startCamera} disabled={busy}>
                    <Icon name="camera" size={16} />
                    Start Camera
                  </Button>
                </div>
              )}

              {cameraLoading && !capturedSnapshot && (
                <div className="max-w-xs space-y-2 p-5 text-center">
                  <p className="text-sm text-slate-200">Starting camera…</p>
                </div>
              )}

              {cameraError && !cameraActive && !capturedSnapshot && (
                <div className="max-w-xs space-y-3 p-5 text-center" role="alert">
                  <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-red-500/20 text-red-200">
                    <Icon name="alert" size={22} />
                  </div>
                  <h3 className="text-sm font-bold text-white">Camera unavailable</h3>
                  <p className="text-xs text-red-200">{cameraError}</p>
                  <Button type="button" variant="secondary" onClick={startCamera} disabled={busy}>
                    <Icon name="refresh" size={16} />
                    Try again
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {cameraActive && !capturedSnapshot && (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleCaptureSnapshot}
                      disabled={busy}
                    >
                      <Icon name="camera" size={16} />
                      Capture Task Evidence
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={stopCamera}
                      disabled={busy}
                    >
                      Stop camera
                    </Button>
                  </>
                )}

                {capturedSnapshot && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleRetakePhoto}
                      disabled={busy}
                    >
                      <Icon name="refresh" size={15} />
                      Retake photo
                    </Button>
                    <Button
                      type="button"
                      variant="quiet"
                      onClick={handleClearCapture}
                      disabled={busy}
                    >
                      Remove photo
                    </Button>
                  </>
                )}

                {!cameraActive && !capturedSnapshot && !cameraLoading && (
                  <Button type="button" variant="secondary" onClick={startCamera} disabled={busy}>
                    <Icon name="camera" size={15} />
                    {cameraError ? 'Try camera again' : 'Turn on camera'}
                  </Button>
                )}
              </div>

              {capturedSnapshot ? (
                <p className="text-xs font-semibold text-emerald-800">
                  Photo captured ({capturedTimeLabel}). Ready to submit.
                </p>
              ) : (
                <p className="text-xs text-slate-600">
                  Take a clear photo before submitting your weekly report.
                </p>
              )}

              {triedSubmit && validationErrors.snapshot && (
                <p role="alert" className="text-xs font-semibold text-red-700">
                  {validationErrors.snapshot}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-600">
            Sent to your supervisor for review before hours are added to your total.
          </p>
          <Button type="submit" variant="primary" disabled={busy || hasDuplicateActiveWeek}>
            <Icon name="check" size={16} />
            {busy
              ? 'Submitting…'
              : weekSummary.returnedReport
              ? `Resubmit Week ${weekNumber} Report`
              : `Submit Week ${weekNumber} Report`}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * Component 2 & Component 3: Submitted Weekly Task Reports List (Weekly reports only per student view design)
 */
export function SubmittedTaskLogsCard({ logs = [] }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [week, setWeek] = useState('all');
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState({});
  const [inspectedIds, setInspectedIds] = useState({});
  const [evidenceModalLog, setEvidenceModalLog] = useState(null);
  const searchInputRef = useRef(null);

  // Show only weekly reports in the Task Logs list (daily DTR logs live in Attendance & DTR)
  const weeklyLogs = filterTaskLogs(logs, { recordType: 'weekly_task' });

  const distinctWeeks = Array.from(
    new Set(weeklyLogs.map(item => Number(item.weekNumber)).filter(Boolean))
  ).sort((a, b) => b - a);

  const filteredLogs = filterTaskLogs(weeklyLogs, {
    query,
    recordType: 'weekly_task',
    status,
    week
  });

  const filteredSummary = summarizeTaskLogs(filteredLogs);
  const pagination = paginateTaskLogs(filteredLogs, page, 8);

  const hasActiveFilters = Boolean(query.trim()) || status !== 'all' || week !== 'all';

  function handleResetFilters() {
    setQuery('');
    setStatus('all');
    setWeek('all');
    setPage(1);
  }

  function toggleExpand(logId) {
    setExpandedIds(prev => ({ ...prev, [logId]: !prev[logId] }));
  }

  function toggleInspect(logId) {
    setInspectedIds(prev => ({ ...prev, [logId]: !prev[logId] }));
  }

  return (
    <Card className="p-5 space-y-4" aria-labelledby={`${id}-logs-heading`}>
      <SectionHeading
        id={`${id}-logs-heading`}
        title="Submitted weekly reports"
        action={
          <span className="text-xs font-semibold text-slate-600">
            Showing <strong>{filteredLogs.length}</strong> of {weeklyLogs.length}{' '}
            {weeklyLogs.length === 1 ? 'report' : 'reports'}
          </span>
        }
      />

      {/* Search & Filter Toolbar (only shown when there are reports) */}
      {weeklyLogs.length > 0 && (
        <div
          className="grid gap-3 sm:grid-cols-3"
          role="search"
          aria-label="Filter submitted task logs"
        >
          <SearchField
            inputRef={searchInputRef}
            label="Search reports"
            placeholder="Search by title, skill area, or week…"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setPage(1);
            }}
            onClear={() => {
              setQuery('');
              setPage(1);
              searchInputRef.current?.focus();
            }}
          />

          <Field
            label="Status"
            value={status}
            onChange={event => {
              setStatus(event.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'Coordinator Approved', label: 'Approved' },
              { value: 'Supervisor Verified', label: 'Approved by supervisor' },
              { value: 'Pending Supervisor Verification', label: 'Waiting for review' },
              { value: 'Returned for Revision', label: 'Needs changes' }
            ]}
          />

          <Field
            label="Week"
            value={week}
            onChange={event => {
              setWeek(event.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All weeks' },
              ...distinctWeeks.map(wk => ({ value: String(wk), label: `Week ${wk}` }))
            ]}
          />
        </div>
      )}

      {pagination.items.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? 'No matching reports' : 'No weekly reports yet'}
          description={
            hasActiveFilters
              ? 'No weekly reports match your search or filter.'
              : 'Submit your first weekly report above to track your accomplishments.'
          }
          action={
            hasActiveFilters && (
              <Button type="button" variant="secondary" onClick={handleResetFilters}>
                Reset filters
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-3.5 py-3">
                    Week &amp; Date
                  </th>
                  <th scope="col" className="px-3.5 py-3">
                    Accomplishment &amp; Skill Area
                  </th>
                  <th scope="col" className="px-3.5 py-3 text-right">
                    Hours
                  </th>
                  <th scope="col" className="px-3.5 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-3.5 py-3">
                    Reviewer Notes
                  </th>
                  <th scope="col" className="px-3.5 py-3 text-right">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pagination.items.map(log => {
                  const isExpanded = Boolean(expandedIds[log.id]);
                  const isInspected = Boolean(inspectedIds[log.id]);
                  const summaryText = String(log.description || '').trim();
                  const isLongSummary = summaryText.length > 135;
                  const isReturned = /returned|revision|rejected/i.test(log.status || '');

                  return (
                    <Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/80 align-top">
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="block font-bold text-navy-950">
                            Week {log.weekNumber || '—'}
                          </span>
                          <span className="text-xs tabular-nums text-slate-500">
                            {log.date || '—'}
                          </span>
                        </td>

                        <td className="px-3.5 py-3 max-w-md space-y-1">
                          <div className="font-bold text-slate-900">
                            {log.title || 'Untitled Report'}
                          </div>
                          {summaryText && (
                            <>
                              <p
                                className={`text-xs text-slate-600 ${
                                  isLongSummary && !isExpanded ? 'line-clamp-2' : ''
                                }`}
                              >
                                {summaryText}
                              </p>
                              {isLongSummary && (
                                <button
                                  type="button"
                                  className="text-xs font-bold text-navy-700 hover:underline"
                                  onClick={() => toggleExpand(log.id)}
                                  aria-expanded={isExpanded}
                                >
                                  {isExpanded ? 'Show less' : 'Read more'}
                                </button>
                              )}
                            </>
                          )}
                          {log.competencyTag && (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {log.competencyTag}
                            </span>
                          )}
                        </td>

                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <span className="block font-extrabold tabular-nums text-navy-950">
                            {Number(log.hours || 0).toFixed(1)} hrs
                          </span>
                        </td>

                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <StatusBadge status={log.status} plain />
                        </td>

                        <td className="px-3.5 py-3 text-xs text-slate-600 max-w-xs">
                          {isReturned ? (
                            <div
                              role="alert"
                              className="rounded-md border border-red-200 bg-red-50 p-2 text-red-900"
                            >
                              <strong className="block font-bold">Needs changes</strong>
                              <span>
                                {log.remarks || 'Update your report and resubmit.'}
                              </span>
                            </div>
                          ) : log.remarks ? (
                            <span>{log.remarks}</span>
                          ) : (
                            <span className="text-slate-400">No notes yet</span>
                          )}
                        </td>

                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => toggleInspect(log.id)}
                            aria-expanded={isInspected}
                          >
                            {isInspected ? 'Hide' : 'Details'}
                          </Button>
                        </td>
                      </tr>

                      {isInspected && (
                        <tr className="bg-slate-50">
                          <td colSpan={6} className="p-4">
                            <VerificationChainDrawer
                              log={log}
                              onOpenEvidence={() => setEvidenceModalLog(log)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Card List (< 768px) */}
          <div className="space-y-3 md:hidden" role="list" aria-label="Submitted task logs">
            {pagination.items.map(log => {
              const isExpanded = Boolean(expandedIds[log.id]);
              const isInspected = Boolean(inspectedIds[log.id]);
              const summaryText = String(log.description || '').trim();
              const isLongSummary = summaryText.length > 135;
              const isReturned = /returned|revision|rejected/i.test(log.status || '');

              return (
                <article
                  key={log.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                  role="listitem"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-sm font-bold text-navy-950">
                        Week {log.weekNumber || '—'}
                      </span>
                      <span className="ml-2 text-xs tabular-nums text-slate-500">
                        {log.date || '—'}
                      </span>
                    </div>
                    <StatusBadge status={log.status} plain />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-slate-900">
                      {log.title || 'Untitled Report'}
                    </h3>
                    {summaryText && (
                      <>
                        <p
                          className={`text-xs text-slate-600 ${
                            isLongSummary && !isExpanded ? 'line-clamp-2' : ''
                          }`}
                        >
                          {summaryText}
                        </p>
                        {isLongSummary && (
                          <button
                            type="button"
                            className="text-xs font-bold text-navy-700 hover:underline"
                            onClick={() => toggleExpand(log.id)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </>
                    )}
                    {log.competencyTag && (
                      <p className="text-xs text-slate-500">
                        Skill area: <strong className="text-slate-700">{log.competencyTag}</strong>
                      </p>
                    )}
                  </div>

                  {isReturned && (
                    <div
                      role="alert"
                      className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-900"
                    >
                      <strong className="block font-bold">Needs changes:</strong>
                      <span>{log.remarks || 'Update your report and resubmit.'}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5">
                    <span className="text-sm font-extrabold tabular-nums text-navy-950">
                      {Number(log.hours || 0).toFixed(1)} hrs
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleInspect(log.id)}
                      aria-expanded={isInspected}
                    >
                      {isInspected ? 'Hide' : 'Details'}
                    </Button>
                  </div>

                  {isInspected && (
                    <VerificationChainDrawer
                      log={log}
                      onOpenEvidence={() => setEvidenceModalLog(log)}
                    />
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Footer Totals & Conditional Pagination */}
      {filteredLogs.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <div className="flex flex-wrap gap-4 font-bold text-slate-800">
            <span>Reported: {filteredSummary.reportedHoursTotal} hrs</span>
            <span>Approved: {filteredSummary.verifiedOrApprovedHoursTotal} hrs</span>
            {filteredSummary.pendingHoursTotal > 0 && (
              <span>Waiting for review: {filteredSummary.pendingHoursTotal} hrs</span>
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-2" role="navigation" aria-label="Task logs pagination">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pagination.currentPage <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <span>
                Page <strong>{pagination.currentPage}</strong> of{' '}
                <strong>{pagination.totalPages}</strong>
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Full-Size Camera Evidence & Verification Modal */}
      {evidenceModalLog && (
        <Modal
          title={`Week ${evidenceModalLog.weekNumber || '—'} Work Photo`}
          onClose={() => setEvidenceModalLog(null)}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">{evidenceModalLog.title}</h3>
                <p className="text-xs text-slate-600">
                  {evidenceModalLog.date} · {Number(evidenceModalLog.hours || 0).toFixed(1)} hrs ·{' '}
                  {evidenceModalLog.company || 'Partner HTE'}
                </p>
              </div>
              <StatusBadge status={evidenceModalLog.status} plain />
            </div>

            {evidenceModalLog.photo && (
              <img
                src={evidenceModalLog.photo}
                alt={`Captured camera evidence for ${evidenceModalLog.title}`}
                className="max-h-[420px] w-full rounded-xl border border-slate-200 object-contain bg-slate-950"
              />
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
              <p>
                <strong>Skill area:</strong>{' '}
                {evidenceModalLog.competencyTag || 'Weekly report'}
              </p>
              <p>
                <strong>Supervisor:</strong>{' '}
                {evidenceModalLog.supervisorVerifiedBy || 'Waiting for review'}
              </p>
              <p>
                <strong>Coordinator:</strong>{' '}
                {evidenceModalLog.coordinatorApprovedBy || 'Waiting for review'}
              </p>
              <p>
                <strong>Reviewer notes:</strong>{' '}
                {evidenceModalLog.remarks || 'No notes yet.'}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

/**
 * Component 3: Expandable 3-Stage Verification Chain, Hours Attribution & Live Evidence Drawer
 */
export function VerificationChainDrawer({ log, onOpenEvidence }) {
  const details = getVerificationChainDetails(log);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 text-xs"
      role="region"
      aria-label="Verification and evidence details"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Icon name="shield" size={16} className="text-navy-800" />
          <span>Review progress &amp; photo</span>
        </div>
        <StatusBadge status={details.status} plain />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Panel 1: 3-Stage Review Progress */}
        <div className="space-y-2.5">
          <h4 className="font-bold text-slate-900">1. Review progress</h4>
          <ol className="space-y-2">
            {details.steps.map(step => (
              <li
                key={step.key}
                className={`flex items-start gap-2.5 rounded-lg border p-2.5 ${
                  step.state === 'completed'
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : step.state === 'returned'
                    ? 'border-red-200 bg-red-50/60'
                    : step.state === 'active'
                    ? 'border-navy-200 bg-navy-50/50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    step.state === 'completed'
                      ? 'bg-emerald-600 text-white'
                      : step.state === 'returned'
                      ? 'bg-red-600 text-white'
                      : step.state === 'active'
                      ? 'bg-navy-700 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {step.state === 'completed' ? '✓' : step.state === 'returned' ? '!' : step.stepNumber}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{step.title}</span>
                    <span className="font-semibold text-slate-600">{step.badge}</span>
                  </div>
                  <p className="font-medium text-slate-700">{step.actor}</p>
                  <p className="text-slate-500">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Panel 2: Hours Summary */}
        <div className="space-y-2.5">
          <h4 className="font-bold text-slate-900">2. Hours summary</h4>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Reported hours</span>
              <strong className="tabular-nums text-slate-900">
                {details.reportedHours.toFixed(1)} hrs
              </strong>
            </div>
            {details.dtrReferenceHours != null && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Week {log.weekNumber} DTR hours</span>
                <strong className="tabular-nums text-slate-900">
                  {details.dtrReferenceHours.toFixed(1)} hrs
                </strong>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="font-semibold text-slate-700">Approved hours</span>
              <strong className="tabular-nums text-navy-950">
                {details.creditedHours.toFixed(1)} hrs
              </strong>
            </div>
          </div>

          <p
            className={`rounded-lg border px-3 py-2 font-semibold ${
              details.isCredited
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : details.isReturned
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            {details.creditStatusLabel}
          </p>
        </div>

        {/* Panel 3: Captured Work Photo */}
        <div className="space-y-2.5">
          <h4 className="font-bold text-slate-900">3. Work photo</h4>
          {details.hasCameraEvidence ? (
            <div className="space-y-2">
              <img
                src={log.photo}
                alt={`Task evidence for ${log.title}`}
                className="h-32 w-full rounded-lg border border-slate-200 object-cover bg-slate-950"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={onOpenEvidence}
              >
                <Icon name="camera" size={14} />
                View full photo
              </Button>
            </div>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-500">
              No photo attached to this record.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Component 5: OJT Narrative Report Composer with Session Persistence & Official Print Modal
 */
export function NarrativeReportCard({ user, db, logs = [] }) {
  const id = useId();
  const initialDraft = loadNarrativeDraft(user);

  const [intro, setIntro] = useState(initialDraft.intro);
  const [reflection, setReflection] = useState(initialDraft.reflection);
  const [isSavedDraft, setIsSavedDraft] = useState(initialDraft.isSavedDraft);
  const [draftFeedback, setDraftFeedback] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [previousDraft, setPreviousDraft] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const verifiedLogsCount = (logs || []).filter(item =>
    ['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(item.status)
  ).length;

  function handleIntroChange(event) {
    const nextIntro = event.target.value;
    setIntro(nextIntro);
    saveNarrativeDraft(user, { intro: nextIntro, reflection });
    setIsSavedDraft(true);
    setDraftFeedback('');
  }

  function handleReflectionChange(event) {
    const nextReflection = event.target.value;
    setReflection(nextReflection);
    saveNarrativeDraft(user, { intro, reflection: nextReflection });
    setIsSavedDraft(true);
    setDraftFeedback('');
  }

  function handleExplicitSave() {
    saveNarrativeDraft(user, { intro, reflection });
    setIsSavedDraft(true);
    setDraftFeedback('Draft saved on this device.');
  }

  function handleResetTemplate() {
    setPreviousDraft({ intro, reflection });
    const defaults = getDefaultNarrativeTemplate(user);
    setIntro(defaults.intro);
    setReflection(defaults.reflection);
    saveNarrativeDraft(user, defaults);
    setIsSavedDraft(false);
    setConfirmingReset(false);
    setDraftFeedback('Reset to default template.');
  }

  function handleUndoReset() {
    if (!previousDraft) return;
    setIntro(previousDraft.intro);
    setReflection(previousDraft.reflection);
    saveNarrativeDraft(user, previousDraft);
    setIsSavedDraft(true);
    setPreviousDraft(null);
    setDraftFeedback('Restored your previous narrative draft.');
  }

  return (
    <Card className="p-5 space-y-5" aria-labelledby={`${id}-narrative-heading`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={`${id}-narrative-heading`} className="text-lg font-bold text-slate-900">
            Narrative report
          </h2>
          <p className="text-sm text-slate-600">
            Write your training overview and reflections, then preview and print your report.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={isSavedDraft ? 'success' : 'neutral'}>
            {isSavedDraft ? 'Draft saved' : 'Default template'}
          </StatusBadge>
          <Button type="button" variant="primary" onClick={() => setPreviewOpen(true)}>
            <Icon name="printer" size={16} />
            Preview &amp; Print Narrative
          </Button>
        </div>
      </div>

      {/* Placement Context Strip */}
      <div
        className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4 text-xs"
        aria-label="Narrative placement metadata"
      >
        <div>
          <span className="block font-semibold text-slate-500">Host company</span>
          <strong className="text-slate-900">{user.company || 'Partner HTE'}</strong>
        </div>
        <div>
          <span className="block font-semibold text-slate-500">Role</span>
          <strong className="text-slate-900">{user.assignedRole || 'Student Intern'}</strong>
        </div>
        <div>
          <span className="block font-semibold text-slate-500">Program</span>
          <strong className="text-slate-900">{user.program || user.college}</strong>
        </div>
        <div>
          <span className="block font-semibold text-slate-500">Approved logs included</span>
          <strong className="text-slate-900">
            {verifiedLogsCount} of {logs.length} records
          </strong>
        </div>
      </div>

      {draftFeedback && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900"
        >
          <span>{draftFeedback}</span>
          {previousDraft && (
            <button
              type="button"
              onClick={handleUndoReset}
              className="font-bold text-navy-800 underline underline-offset-2"
            >
              Undo reset
            </button>
          )}
        </div>
      )}

      <Field
        label="I. Host company & training overview"
        multiline
        rows={5}
        value={intro}
        onChange={handleIntroChange}
        placeholder="Summarize your host company, department, and main responsibilities…"
        hint="Saved automatically as you type."
      />

      <Field
        label="II. Key learnings & reflections"
        multiline
        rows={5}
        value={reflection}
        onChange={handleReflectionChange}
        placeholder="Share the skills you practiced, challenges you solved, and what you learned…"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={handleExplicitSave}>
            Save draft
          </Button>
          {confirmingReset ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs">
              <span className="font-semibold text-red-900">Replace your draft with default text?</span>
              <Button type="button" variant="danger" size="sm" onClick={handleResetTemplate}>
                Confirm reset
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirmingReset(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" variant="quiet" onClick={() => setConfirmingReset(true)}>
              Reset to default
            </Button>
          )}
        </div>

        <Button type="button" variant="primary" onClick={() => setPreviewOpen(true)}>
          <Icon name="printer" size={16} />
          Preview &amp; Print Narrative
        </Button>
      </div>

      {previewOpen && (
        <Modal
          title={`Official OJT Narrative & Accomplishment Report · ${user.name}`}
          onClose={() => setPreviewOpen(false)}
        >
          <StudentNarrativeModal
            user={user}
            db={db}
            logs={logs}
            intro={intro}
            reflection={reflection}
            onClose={() => setPreviewOpen(false)}
          />
        </Modal>
      )}
    </Card>
  );
}

/**
 * Component 5: Official NEMSU Main Campus Printable Narrative & Accomplishment Report Modal
 */
export function StudentNarrativeModal({
  user,
  db,
  logs = [],
  intro = '',
  reflection = '',
  onClose
}) {
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const college = user.college || 'CITE';
  const requiredHours = Number(db?.collegeSettings?.[college]?.requiredHours) || 324;
  const creditedHours = approvedHours(db, user);

  const displayedLogs = [...(logs || [])]
    .filter(item =>
      verifiedOnly
        ? ['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(item.status)
        : true
    )
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

  const totalDisplayedHours = displayedLogs.reduce((sum, item) => sum + Number(item.hours || 0), 0);

  const coordinator = (db?.users || []).find(
    u => u.role === 'coordinator' && (u.college === college || college === 'ALL')
  );
  const supervisor = (db?.users || []).find(
    u => u.role === 'supervisor' && u.company === user.company
  );

  return (
    <div className="narrative-print-modal-content">
      <div className="narrative-print-toolbar print:hidden">
        <div>
          <p className="text-xs font-bold text-slate-900">
            Printable OJT Narrative &amp; Accomplishment Report
          </p>
          <p className="text-xs text-slate-600">
            {displayedLogs.length} accomplishment records included ·{' '}
            {totalDisplayedHours.toFixed(1)} reported hours ({creditedHours.toFixed(1)} hrs
            officially credited)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold text-slate-700 mr-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-navy-700"
              checked={verifiedOnly}
              onChange={event => setVerifiedOnly(event.target.checked)}
            />
            Approved logs only
          </label>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="primary" onClick={() => window.print()}>
            <Icon name="printer" size={16} />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <article className="print-sheet print-report">
        <header className="print-letterhead">
          <img src="/internms-logo.svg" alt="NEMSU Seal" className="print-letterhead-logo" />
          <div className="print-letterhead-center">
            <div className="print-sup">Republic of the Philippines</div>
            <div className="print-univ-name">North Eastern Mindanao State University</div>
            <div className="print-campus">Main Campus · Rosario, Tandag City, Surigao del Sur</div>
            <div className="print-office">
              Office of Student Internship Program (SIPP) · {db?.academicYear || 'A.Y. 2026–2027'}
            </div>
          </div>
          <div style={{ width: 56 }} aria-hidden="true" />
        </header>

        <div className="print-doc-title">
          <h2>STUDENT INTERNSHIP NARRATIVE &amp; ACCOMPLISHMENT REPORT</h2>
          <p>Official On-the-Job Training Competency &amp; Weekly Accomplishment Record</p>
        </div>

        <div className="print-student-info-grid">
          <div>
            <dt>Student Intern Name:</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Student ID Number:</dt>
            <dd>{user.studentNumber || user.id}</dd>
          </div>
          <div>
            <dt>Degree Program &amp; College:</dt>
            <dd>
              {user.program || college} ({college})
            </dd>
          </div>
          <div>
            <dt>Host Training Establishment:</dt>
            <dd>{user.company || 'Partner HTE'}</dd>
          </div>
          <div>
            <dt>Assigned Internship Role:</dt>
            <dd>{user.assignedRole || 'Student Intern'}</dd>
          </div>
          <div>
            <dt>Credited / Required OJT Quota:</dt>
            <dd>
              {creditedHours} / {requiredHours} Hours
            </dd>
          </div>
        </div>

        <section className="narrative-section-block">
          <h3 className="narrative-section-title">I. Host Company &amp; Training Overview</h3>
          <p className="narrative-section-prose">
            {intro.trim() || 'No training overview text entered.'}
          </p>
        </section>

        <section className="narrative-section-block">
          <h3 className="narrative-section-title">
            II. Key Learnings, Competency Outcomes &amp; Reflections
          </h3>
          <p className="narrative-section-prose">
            {reflection.trim() || 'No learning reflection text entered.'}
          </p>
        </section>

        <section className="narrative-section-block">
          <h3 className="narrative-section-title">
            III. Summary of Submitted Accomplishments &amp; Competency Logs
          </h3>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '13%' }}>Date</th>
                <th style={{ width: '11%' }}>Week / Type</th>
                <th style={{ width: '36%' }}>Accomplishment &amp; Deliverables</th>
                <th style={{ width: '18%' }}>Competency Outcome</th>
                <th style={{ width: '8%' }}>Hours</th>
                <th style={{ width: '14%' }}>Verification Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '18px', textAlign: 'center', color: '#64748b' }}>
                    No task or attendance logs match the selected filter.
                  </td>
                </tr>
              ) : (
                displayedLogs.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, textAlign: 'left' }}>
                      {formatDateDisplay(item.date)}
                    </td>
                    <td>
                      Wk {item.weekNumber || '—'} ·{' '}
                      {item.kind === 'weekly_task' ? 'Weekly' : 'DTR'}
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      <strong>{item.title}</strong>
                      {item.description && item.description !== item.title && (
                        <div style={{ fontSize: '10px', color: '#334155', marginTop: '2px' }}>
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '10px', textAlign: 'left' }}>
                      {item.competencyTag || '—'}
                    </td>
                    <td style={{ fontWeight: 700 }}>{Number(item.hours || 0).toFixed(1)}</td>
                    <td style={{ fontSize: '10px', textAlign: 'left' }}>
                      <strong>{item.status}</strong>
                      {item.supervisorVerifiedBy && (
                        <span style={{ display: 'block', color: '#475569' }}>
                          Sup: {item.supervisorVerifiedBy}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {displayedLogs.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                  <td colSpan={4} style={{ textAlign: 'right', paddingRight: '12px' }}>
                    TOTAL LOGGED HOURS IN REPORT:
                  </td>
                  <td>{totalDisplayedHours.toFixed(1)} hrs</td>
                  <td style={{ fontSize: '10px', textAlign: 'left' }}>
                    {creditedHours.toFixed(1)} hrs officially credited
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </section>

        <div className="narrative-signatures-grid">
          <div className="narrative-sig-box">
            <div>Prepared &amp; Submitted By:</div>
            <div className="narrative-sig-line">{user.name}</div>
            <div className="narrative-sig-role">
              Student Intern · {user.program || college}
            </div>
          </div>

          <div className="narrative-sig-box">
            <div>Verified By (Host Establishment):</div>
            <div className="narrative-sig-line">
              {supervisor?.name || 'Host Training Supervisor'}
            </div>
            <div className="narrative-sig-role">
              {supervisor?.title || 'HTE Immediate Supervisor'} · {user.company || 'Partner HTE'}
            </div>
          </div>

          <div className="narrative-sig-box">
            <div>Approved &amp; Certified By:</div>
            <div className="narrative-sig-line">
              {coordinator?.name || 'College OJT Coordinator'}
            </div>
            <div className="narrative-sig-role">
              {coordinator?.title || 'OJT Coordinator'} · {college}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
