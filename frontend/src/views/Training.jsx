import { Fragment, useEffect, useId, useRef, useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  HelpTip,
  Notice,
  PageHeader,
  ProgressBar,
  SectionHeading,
  StatusBadge,
  SummaryMetrics,
  Tabs
} from '../components/ui.jsx';
import { Icon } from '../components/Icons.jsx';
import { Field, Modal, SearchField, useMutation } from '../components/workflow.jsx';
import { submitWeeklyTaskReport } from '../services/applicationService.js';
import { approvedHours, studentLogs } from '../services/training.js';
import { formatDateDisplay, formatTime12 } from '../services/studentAttendance.js';
import {
  filterTaskLogs,
  getCompetencyOptionsForCollege,
  getDefaultNarrativeTemplate,
  getTaskLogsModuleOverview,
  getVerificationChainDetails,
  getWeekTaskSummary,
  loadNarrativeDraft,
  paginateTaskLogs,
  summarizeTaskLogs,
  validateWeeklyTaskReport
} from '../services/studentTaskLogs.js';
import './studentTaskLogs.css';



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

export function Training({ user, db, onChange }) {
  return <StudentTaskLogs user={user} db={db} onChange={onChange} />;
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
  return '';
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

      {/* 4-Column KPI Overview Strip */}
      <h2 id={`${id}-overview-heading`} className="sr-only">Task progress summary</h2>
      <SummaryMetrics className="task-kpi-grid" ariaLabel="Task progress summary" items={[
        { node: (
          <div>
            <div className="ds-metrics-head"><span className="text-xs font-semibold uppercase tracking-wider text-muted">Approved OJT Hours</span><StatusBadge tone="success">Verified</StatusBadge></div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{overview.approvedOjtHours} <span className="text-sm font-medium text-muted">{overview.requiredQuota != null ? `/ ${overview.requiredQuota} hrs` : 'hrs'}</span></p>
            <div className="mt-2 space-y-1">
              <ProgressBar label="Approved OJT hours progress" value={overview.approvedOjtHours} max={overview.requiredQuota} />
              <p className="text-xs text-muted">{overview.quotaPercent != null ? `${overview.quotaPercent}% curriculum quota completed` : 'Quota calculation unavailable'}</p>
            </div>
          </div>
        ) },
        { label: 'Weekly Reports', value: `${overview.weeklyReportsSubmitted}`, badge: <StatusBadge tone="info">{overview.weeklyReportsVerified} approved</StatusBadge>, detail: `Across ${overview.distinctWeeksLogged} ${overview.distinctWeeksLogged === 1 ? 'week' : 'weeks'} recorded` },
        { label: 'Competencies Logged', value: `${overview.distinctCompetenciesCount}`, detail: `${user.college || 'Degree'} skill areas covered` },
        { label: 'Queued for Review', value: `${overview.pendingReviewHours} hrs`, badge: overview.returnedRevisionCount > 0 ? <StatusBadge tone="danger">{overview.returnedRevisionCount} needs changes</StatusBadge> : <StatusBadge tone="warning">{overview.pendingReviewCount} pending</StatusBadge>, detail: 'Counts once supervisor & coordinator sign off' }
      ]} />


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
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [hours, setHours] = useState(
    initialSummary.dtrRecordedHours > 0 ? initialSummary.dtrRecordedHours : ''
  );
  const [selectedCompetency, setSelectedCompetency] = useState(
    competencyPresets[0] || 'custom'
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
          periodStart,
          periodEnd,
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
      className="p-6 space-y-5 border-l-4 border-l-accent"
      aria-labelledby={`${id}-report-heading`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={`${id}-report-heading`} className="text-lg font-semibold text-ink">
            Submit Weekly Accomplishment Report
          </h2>
          <p className="text-sm text-muted">
            Record tasks delivered this week and capture live camera evidence for supervisor verification.
          </p>
        </div>
        <StatusBadge
          tone={capturedSnapshot ? 'success' : cameraActive ? 'info' : 'neutral'}
        >
          {capturedSnapshot
            ? 'Photo ready'
            : cameraActive
            ? 'Camera active'
            : 'Photo required'}
        </StatusBadge>
      </div>

      {/* Duplicate Week or Revision Alert */}
      {weekSummary.existingActiveReport && (
        <Notice
          tone="warning"
          title={`Week ${weekNumber} already submitted`}
        >
          <span>
            &ldquo;{weekSummary.existingActiveReport.title}&rdquo; ({weekSummary.existingActiveReport.hours}{' '}
            hrs) is currently{' '}
            <strong>
              {weekSummary.existingActiveReport.status === 'Pending Supervisor Verification'
                ? 'waiting for supervisor review'
                : weekSummary.existingActiveReport.status}
            </strong>
            . Select a different week above to record new deliverables.
          </span>
        </Notice>
      )}

      {!weekSummary.existingActiveReport && weekSummary.returnedReport && (
        <Notice
          tone="danger"
          title={`Week ${weekNumber} returned for revision`}
        >
          <span>
            {weekSummary.returnedReport.remarks ||
              'Update your weekly summary and capture a replacement photo to resubmit for verification.'}
          </span>
        </Notice>
      )}

      {statusMessage && (
        <Notice tone="success">
          <span>{statusMessage}</span>
        </Notice>
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
            label="Report start date"
            type="date"
            required
            value={periodStart}
            onChange={event => setPeriodStart(event.target.value)}
            disabled={busy}
          />
          <Field
            label="Report end date"
            type="date"
            required
            value={periodEnd}
            onChange={event => setPeriodEnd(event.target.value)}
            disabled={busy}
          />
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
            label={`Skill area (${user.college || ''})`}
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
          className={`rounded-panel border p-5 space-y-4 ${
            triedSubmit && validationErrors.snapshot
              ? 'border-danger bg-danger-surface'
              : 'border-line bg-subtle'
          }`}
          role="group"
          aria-labelledby={`${id}-camera-heading`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon name="camera" size={18} className="text-accent" />
              <span id={`${id}-camera-heading`} className="text-sm font-semibold text-ink">
                Live Work Photo Verification <span className="text-danger">*</span>
              </span>
            </div>
            <HelpTip label="Why a live photo?">
              Weekly task reports require a live photo capture from your device camera so your host supervisor can verify completion. Local file uploads are not accepted for task logs.
            </HelpTip>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-center">
            <div className="task-camera-well">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ display: cameraActive && !capturedSnapshot ? 'block' : 'none' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {capturedSnapshot && (
                <>
                  <img
                    src={capturedSnapshot}
                    alt="Captured live camera evidence for weekly task report"
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
                    <span className="ds-badge ds-tone--success">
                      <Icon name="check" size={13} />
                      Photo captured
                    </span>
                    <span className="ds-badge ds-tone--neutral">
                      {capturedTimeLabel}
                    </span>
                  </div>
                </>
              )}

              {cameraActive && !capturedSnapshot && (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
                  <span className="ds-badge ds-tone--neutral">
                    Camera ready
                  </span>
                </div>
              )}

              {!cameraActive && !cameraLoading && !cameraError && !capturedSnapshot && (
                <div className="max-w-xs space-y-3 p-5 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface text-accent border border-line">
                    <Icon name="camera" size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-ink">Capture Work Evidence</h3>
                    <p className="text-xs text-muted">
                      Start your camera to photograph your current workstation or deliverable output.
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
                  <p className="text-sm font-medium text-ink">Starting camera…</p>
                </div>
              )}

              {cameraError && !cameraActive && !capturedSnapshot && (
                <div className="max-w-xs space-y-3 p-5 text-center" role="alert">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-surface text-danger border border-red-200">
                    <Icon name="alert" size={22} />
                  </div>
                  <h3 className="text-sm font-semibold text-danger">Camera unavailable</h3>
                  <p className="text-xs text-danger">{cameraError}</p>
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
                <p className="text-xs font-semibold text-success">
                  Photo captured ({capturedTimeLabel}). Ready to submit.
                </p>
              ) : (
                <p className="text-xs text-muted">
                  Take a clear photo before submitting your weekly report.
                </p>
              )}

              {triedSubmit && validationErrors.snapshot && (
                <p role="alert" className="text-xs font-semibold text-danger">
                  {validationErrors.snapshot}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-xs text-muted">
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
          icon={hasActiveFilters ? 'search' : 'document'}
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
      className="rounded-panel border border-line bg-surface p-5 space-y-4 text-xs"
      role="region"
      aria-label="Verification and evidence details"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <Icon name="shield" size={16} className="text-accent" />
          <span>Verification Pipeline &amp; Photo Artifact</span>
        </div>
        <StatusBadge status={details.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Panel 1: 3-Stage Review Progress */}
        <div className="space-y-2.5">
          <h4 className="font-semibold text-ink">1. Review progress pipeline</h4>
          <ol className="space-y-2">
            {details.steps.map(step => (
              <li
                key={step.key}
                className={`flex items-start gap-2.5 rounded-panel border p-3 ${
                  step.state === 'completed'
                    ? 'task-pipeline-card--completed'
                    : step.state === 'returned'
                    ? 'task-pipeline-card--returned'
                    : step.state === 'active'
                    ? 'task-pipeline-card--active'
                    : 'border-line bg-subtle'
                }`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    step.state === 'completed'
                      ? 'bg-success text-white'
                      : step.state === 'returned'
                      ? 'bg-danger text-white'
                      : step.state === 'active'
                      ? 'bg-accent text-white'
                      : 'bg-subtle text-muted border border-line'
                  }`}
                >
                  {step.state === 'completed' ? '✓' : step.state === 'returned' ? '!' : step.stepNumber}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">{step.title}</span>
                    <span className="font-semibold text-muted">{step.badge}</span>
                  </div>
                  <p className="font-medium text-ink">{step.actor}</p>
                  <p className="text-muted">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Panel 2: Hours Summary */}
        <div className="space-y-2.5">
          <h4 className="font-semibold text-ink">2. Hours credited vs reported</h4>
          <div className="rounded-panel border border-line bg-subtle p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted">Reported hours</span>
              <strong className="tabular-nums text-ink">
                {details.reportedHours.toFixed(1)} hrs
              </strong>
            </div>
            {details.dtrReferenceHours != null && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Week {log.weekNumber} DTR reference</span>
                <strong className="tabular-nums text-ink">
                  {details.dtrReferenceHours.toFixed(1)} hrs
                </strong>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line pt-2">
              <span className="font-semibold text-ink">Approved hours credited</span>
              <strong className="tabular-nums text-accent font-bold">
                {details.creditedHours.toFixed(1)} hrs
              </strong>
            </div>
          </div>

          <p
            className={`rounded-control border px-3 py-2 font-semibold ${
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
          <h4 className="font-semibold text-ink">3. Work photo evidence</h4>
          {details.hasCameraEvidence ? (
            <div className="space-y-2">
              <img
                src={log.photo}
                alt={`Task evidence for ${log.title}`}
                className="h-32 w-full rounded-control border border-line object-cover bg-subtle"
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
            <p className="rounded-panel border border-line bg-subtle p-3.5 text-muted">
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

    setIsSavedDraft(false);
    setDraftFeedback('');
  }

  function handleReflectionChange(event) {
    const nextReflection = event.target.value;
    setReflection(nextReflection);

    setIsSavedDraft(false);
    setDraftFeedback('');
  }

  function handleExplicitSave() {

    setIsSavedDraft(false);
    setDraftFeedback('Draft saving is unavailable. Changes stay in this form only and will be lost when you leave.');
  }

  function handleResetTemplate() {
    setPreviousDraft({ intro, reflection });
    const defaults = getDefaultNarrativeTemplate(user);
    setIntro(defaults.intro);
    setReflection(defaults.reflection);

    setIsSavedDraft(false);
    setConfirmingReset(false);
    setDraftFeedback('Narrative fields cleared.');
  }

  function handleUndoReset() {
    if (!previousDraft) return;
    setIntro(previousDraft.intro);
    setReflection(previousDraft.reflection);

    setIsSavedDraft(false);
    setPreviousDraft(null);
    setDraftFeedback('Restored your previous narrative draft.');
  }

  return (
    <Card className="p-6 space-y-5" aria-labelledby={`${id}-narrative-heading`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={`${id}-narrative-heading`} className="text-lg font-semibold text-ink">
            OJT Narrative &amp; Competency Report
          </h2>
          <p className="text-sm text-muted">
            Document your training overview and learning reflections, then preview and print your official accomplishment report.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={isSavedDraft ? 'success' : 'neutral'}>
            {isSavedDraft ? 'Draft saved' : 'Not saved'}
          </StatusBadge>
          <Button type="button" variant="primary" onClick={() => setPreviewOpen(true)}>
            <Icon name="printer" size={16} />
            Preview &amp; Print Report
          </Button>
        </div>
      </div>

      {/* Placement Context Strip */}
      <div
        className="grid gap-3 rounded-panel border border-line bg-subtle p-4 sm:grid-cols-4 text-xs"
        aria-label="Narrative placement metadata"
      >
        <div>
          <span className="block font-semibold text-muted">Host company</span>
          <strong className="text-ink">{user.company || '[PLACEHOLDER]'}</strong>
        </div>
        <div>
          <span className="block font-semibold text-muted">Role</span>
          <strong className="text-ink">{user.assignedRole || '[PLACEHOLDER]'}</strong>
        </div>
        <div>
          <span className="block font-semibold text-muted">Program</span>
          <strong className="text-ink">{user.program || user.college || '[PLACEHOLDER]'}</strong>
        </div>
        <div>
          <span className="block font-semibold text-muted">Approved logs included</span>
          <strong className="text-ink">
            {verifiedLogsCount} of {logs.length} records
          </strong>
        </div>
      </div>


      {draftFeedback && (
        <Notice tone="info">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{draftFeedback}</span>
            {previousDraft && (
              <button
                type="button"
                onClick={handleUndoReset}
                className="font-semibold text-accent underline underline-offset-2"
              >
                Undo clear
              </button>
            )}
          </div>
        </Notice>
      )}

      <Field
        label="I. Host company & training overview"
        multiline
        rows={5}
        value={intro}
        onChange={handleIntroChange}
        placeholder="Summarize your host company, department, and main responsibilities…"
        hint="Draft text is preserved in form session only. It is not synced to a remote server until Phase 4."
      />

      <Field
        label="II. Key learnings & reflections"
        multiline
        rows={5}
        value={reflection}
        onChange={handleReflectionChange}
        placeholder="Share the skills you practiced, challenges you solved, and what you learned…"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={handleExplicitSave}>
            Save draft
          </Button>
          {confirmingReset ? (
            <div className="flex items-center gap-2 rounded-panel border border-danger bg-danger-surface px-3 py-1.5 text-xs">
              <span className="font-semibold text-danger">Clear your narrative fields?</span>
              <Button type="button" variant="danger" size="sm" onClick={handleResetTemplate}>
                Confirm clear
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
              Clear draft
            </Button>
          )}
        </div>

        <Button type="button" variant="primary" onClick={() => setPreviewOpen(true)}>
          <Icon name="printer" size={16} />
          Preview &amp; Print Report
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
  const college = user.college || '';
  const requiredHours = Number(db?.collegeSettings?.[college]?.requiredHours) || null;
  const creditedHours = approvedHours(db, user);
  const campus = db?.campus || 'NEMSU Main Campus';
  const campusDisplay = campus.startsWith('NEMSU ') ? campus.replace(/^NEMSU\s+/, '') : campus;
  const academicYear = db?.academicYear || 'A.Y. not recorded';

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
          <p className="text-xs font-semibold text-ink">
            OJT Narrative &amp; Accomplishment Report Preview
          </p>
          <p className="text-xs text-muted">
            {displayedLogs.length} accomplishment records included ·{' '}
            {totalDisplayedHours.toFixed(1)} reported hours ({creditedHours.toFixed(1)} hrs
            officially credited)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold text-ink mr-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded-control border-control text-accent accent-accent"
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
            <div className="print-campus">{campusDisplay} · Rosario, Tandag City, Surigao del Sur</div>
            <div className="print-office">
              Office of Student Internship Program (SIPP) · {academicYear}
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
            <dd>{user.company || '[PLACEHOLDER]'}</dd>
          </div>
          <div>
            <dt>Assigned Internship Role:</dt>
            <dd>{user.assignedRole || '[PLACEHOLDER]'}</dd>
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
              {supervisor?.title || 'HTE Immediate Supervisor'} · {user.company || '[PLACEHOLDER]'}
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

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '9px', color: '#94a3b8' }}>
          System Document ID: NAR-{user.id}-{new Date().toISOString().slice(0, 10)} · InternMS {campus}
        </div>
      </article>
    </div>
  );
}
