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
  StatusBadge
} from '../components/ui.jsx';
import { Icon } from '../components/Icons.jsx';
import { Field, Modal, SearchField, useMutation } from '../components/workflow.jsx';
import {
  recordAttendancePunch,
  submitAttendanceAdjustment
} from '../services/applicationService.js';
import {
  ADJUSTMENT_CATEGORIES,
  PUNCH_CONFIG,
  dailyAttendanceState,
  filterAdjustmentRecords,
  filterDtrRecords,
  formatTime12,
  getAvailableReportingPeriods,
  getDailyAttendanceLog,
  getTodayDateString,
  ojtHoursOverview
} from '../services/studentAttendance.js';
import { studentLogs } from '../services/training.js';
import { StudentAttendanceDtrModal } from './StudentAttendanceDtrModal.jsx';

export function StudentAttendance({ user, db, onChange }) {
  const id = useId();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // DTR Logs filtering
  const [dtrQuery, setDtrQuery] = useState('');
  const [dtrStatus, setDtrStatus] = useState('ALL');
  const [dtrPeriod, setDtrPeriod] = useState('ALL');
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Adjustments filtering & form
  const [adjQuery, setAdjQuery] = useState('');
  const [adjStatus, setAdjStatus] = useState('ALL');
  const [expandedAdjId, setExpandedAdjId] = useState(null);
  const [adjForm, setAdjForm] = useState({
    targetDate: getTodayDateString(),
    reasonCategory: ADJUSTMENT_CATEGORIES[0],
    requestedHours: 8,
    requestedAmIn: '08:00 AM',
    requestedAmOut: '12:00 PM',
    requestedPmIn: '01:00 PM',
    requestedPmOut: '05:00 PM',
    reason: ''
  });

  // Camera attendance states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [workSummary, setWorkSummary] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const searchInputRef = useRef(null);

  const { run, busy, notice } = useMutation(onChange);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const logs = studentLogs(db, user);
  const disputes = (db.dtrDisputes || []).filter(
    item => item.studentId === user.id || (!item.studentId && item.studentName === user.name)
  );

  const overview = ojtHoursOverview(db, user);
  const todayLog = getDailyAttendanceLog(db, user, getTodayDateString());
  const dailyState = dailyAttendanceState(todayLog);

  const availablePeriods = getAvailableReportingPeriods(logs);
  const filteredDtrRecords = filterDtrRecords(logs, {
    period: dtrPeriod,
    status: dtrStatus,
    query: dtrQuery
  });
  const filteredAdjustments = filterAdjustmentRecords(disputes, {
    status: adjStatus,
    query: adjQuery
  });

  const filteredRecordedTotal = filteredDtrRecords.reduce((sum, r) => sum + Number(r.hours || 0), 0);
  const filteredApprovedTotal = filteredDtrRecords
    .filter(r => ['Approved', 'Coordinator Approved', 'Supervisor Verified'].includes(r.status))
    .reduce((sum, r) => sum + Number(r.hours || 0), 0);
  const filteredPendingTotal = filteredDtrRecords
    .filter(r => r.status === 'Pending Supervisor Verification')
    .reduce((sum, r) => sum + Number(r.hours || 0), 0);

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
        setCameraError('No camera found on this device. Connect a camera or request a time fix.');
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

  function captureSnapshot() {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  async function handleRecordPunch(punchType) {
    if (busy) return;
    let snapshot = null;
    if (cameraActive) {
      snapshot = captureSnapshot();
    }

    const targetPunch = punchType || dailyState.nextPunch;
    if (!targetPunch) return;

    const nowTime = formatTime12(currentTime);
    const punchLabel = PUNCH_CONFIG[targetPunch]?.label || targetPunch;

    const success = await run(
      () =>
        recordAttendancePunch(user, {
          punchType: targetPunch,
          dateStr: getTodayDateString(),
          timeStr: nowTime,
          snapshot,
          workSummary
        }),
      `${punchLabel} recorded at ${nowTime}.`
    );

    if (success) {
      setWorkSummary('');
      if (targetPunch === 'PM_OUT') {
        stopCamera();
      }
    }
  }

  async function handleAdjustmentSubmit(e) {
    e.preventDefault();
    if (busy) return;

    const success = await run(
      () => submitAttendanceAdjustment(user, adjForm),
      `Time fix for ${adjForm.targetDate} sent for supervisor review.`
    );

    if (success) {
      setIsAdjustmentModalOpen(false);
      setAdjForm({
        targetDate: getTodayDateString(),
        reasonCategory: ADJUSTMENT_CATEGORIES[0],
        requestedHours: 8,
        requestedAmIn: '08:00 AM',
        requestedAmOut: '12:00 PM',
        requestedPmIn: '01:00 PM',
        requestedPmOut: '05:00 PM',
        reason: ''
      });
    }
  }

  return (
    <div className="student-attendance space-y-6">
      <PageHeader
        title="Attendance & DTR"
        badge={
          <StatusBadge tone={dailyState.statusTone}>{dailyState.statusLabel}</StatusBadge>
        }
        action={
          <>
            <Button variant="secondary" onClick={() => setIsAdjustmentModalOpen(true)}>
              <Icon name="clock" size={16} />
              Fix missed time
            </Button>
            <Button variant="secondary" onClick={() => setIsExportOpen(true)}>
              <Icon name="download" size={16} />
              Export DTR (PDF)
            </Button>
          </>
        }
      />

      {notice}

      {/* 1. PRIMARY TASK FIRST: LIVE TIME IN / OUT */}
      <Card
        className="border-l-4 border-l-gold-500 p-5 space-y-5"
        aria-labelledby={`${id}-camera-title`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id={`${id}-camera-title`} className="text-lg font-bold text-slate-900">
              Time in &amp; out
            </h2>
            <p className="text-sm text-slate-600">{dailyState.summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={cameraActive ? 'success' : 'neutral'}>
              {cameraActive ? 'Camera on' : 'Camera off'}
            </StatusBadge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Camera Preview */}
          <div className="camera-preview-container relative flex aspect-[4/3] max-h-[340px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-navy-800 bg-navy-950 text-white">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover [transform:scaleX(-1)]"
              style={{ display: cameraActive ? 'block' : 'none' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {!cameraActive && !cameraLoading && !cameraError && (
              <div className="max-w-xs space-y-3 p-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/10 text-navy-100">
                  <Icon name="camera" size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Turn on camera to clock in</h3>
                  <p className="text-xs text-slate-300">
                    Takes a quick photo when you record your time.
                  </p>
                </div>
                <Button variant="secondary" onClick={startCamera}>
                  <Icon name="camera" size={16} />
                  Start Camera
                </Button>
              </div>
            )}

            {cameraLoading && (
              <div className="max-w-xs space-y-3 p-6 text-center">
                <p className="text-sm text-slate-200">Starting camera…</p>
              </div>
            )}

            {cameraError && !cameraActive && (
              <div role="alert" className="max-w-xs space-y-3 p-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-500/20 text-red-200">
                  <Icon name="alert" size={24} />
                </div>
                <h3 className="text-base font-bold text-white">Camera unavailable</h3>
                <p className="text-xs text-red-200">{cameraError}</p>
                <Button variant="secondary" onClick={startCamera}>
                  <Icon name="refresh" size={16} />
                  Try again
                </Button>
              </div>
            )}

            {cameraActive && (
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
                <span className="rounded-md bg-slate-950/75 px-2.5 py-1 text-xs font-bold text-white">
                  Camera ready
                </span>
              </div>
            )}
          </div>

          {/* Clock + Sequence + Primary Action */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Clock */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <div className="attendance-clock-time text-2xl font-extrabold tabular-nums text-navy-950">
                    {formatTime12(currentTime)}
                  </div>
                  <div className="text-xs text-slate-600">
                    {currentTime.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500">Logged today</span>
                  <p className="text-base font-extrabold tabular-nums text-navy-950">
                    {todayLog?.hours ? `${todayLog.hours} hrs` : '0.0 hrs'}
                  </p>
                </div>
              </div>

              {/* 4-Step Daily Tracker */}
              <div className="daily-sequence-tracker grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(PUNCH_CONFIG).map(([key, config]) => {
                  const isDone =
                    (key === 'AM_IN' && todayLog?.amIn && todayLog.amIn !== '-') ||
                    (key === 'AM_OUT' && todayLog?.amOut && todayLog.amOut !== '-') ||
                    (key === 'PM_IN' && todayLog?.pmIn && todayLog.pmIn !== '-') ||
                    (key === 'PM_OUT' && todayLog?.pmOut && todayLog.pmOut !== '-');
                  const isNext = dailyState.nextPunch === key;
                  const recordedTime =
                    key === 'AM_IN'
                      ? todayLog?.amIn
                      : key === 'AM_OUT'
                      ? todayLog?.amOut
                      : key === 'PM_IN'
                      ? todayLog?.pmIn
                      : todayLog?.pmOut;

                  return (
                    <div
                      key={key}
                      className={`rounded-lg border p-2.5 text-center text-xs ${
                        isDone
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 font-bold'
                          : isNext
                          ? 'border-navy-700 bg-navy-50 text-navy-950 font-bold ring-1 ring-navy-700/20'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <span className="block font-bold">{config.shortLabel}</span>
                      <span className="mt-0.5 block tabular-nums text-xs">
                        {isDone ? recordedTime : isNext ? 'Next' : config.targetTime}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Optional note + Punch Button */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <Field
                  label="What are you working on? (optional)"
                  type="text"
                  placeholder="e.g. Updating inventory records"
                  value={workSummary}
                  onChange={e => setWorkSummary(e.target.value)}
                  disabled={busy}
                />

                <div className="flex flex-wrap gap-2">
                  {dailyState.nextPunch ? (
                    <Button
                      variant="primary"
                      size="lg"
                      disabled={busy}
                      className="flex-1"
                      onClick={() => {
                        if (!cameraActive) {
                          startCamera().then(() => handleRecordPunch(dailyState.nextPunch));
                        } else {
                          handleRecordPunch(dailyState.nextPunch);
                        }
                      }}
                    >
                      <Icon name="camera" size={18} />
                      {busy ? 'Recording…' : dailyState.nextPunchLabel}
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled className="flex-1">
                      <Icon name="check" size={16} />
                      Done for today
                    </Button>
                  )}

                  {cameraActive && (
                    <Button variant="secondary" onClick={stopCamera}>
                      Stop camera
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <HelpTip label="Why a photo?">
              Your photo and time are saved so your supervisor can verify your attendance and credit
              your OJT hours.
            </HelpTip>
          </div>
        </div>
      </Card>

      {/* 2. COMPACT HOURS SUMMARY STRIP */}
      <Card className="p-5" aria-labelledby={`${id}-overview-title`}>
        <h2 id={`${id}-overview-title`} className="sr-only">
          Hours summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-b border-slate-200 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Approved hours
              </p>
              <StatusBadge tone="success">Approved</StatusBadge>
            </div>
            <p className="attendance-kpi-value mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums text-navy-950">
              {overview.approved} <span className="text-sm font-semibold text-slate-500">/ {overview.required} hrs</span>
            </p>
            <div className="mt-2 space-y-1">
              <ProgressBar
                label="Approved OJT hours progress"
                value={overview.approved}
                max={overview.required}
              />
              <p className="text-xs text-slate-600">{overview.percent}% of required hours</p>
            </div>
          </div>

          <Metric
            label="Remaining"
            value={`${overview.remaining} hrs`}
            detail={`Out of ${overview.required} required hours`}
          />

          <Metric
            label="Waiting for review"
            value={`${overview.pendingVerification} hrs`}
            badge={<StatusBadge tone="warning">Waiting for review</StatusBadge>}
            detail="Counts once your supervisor approves"
          />

          <Metric
            label="Host company"
            value={user.company || 'Not placed'}
            detail={`${overview.totalRecorded} total hours logged in DTR`}
          />
        </div>
      </Card>

      {/* 3. DAILY TIME RECORD (DTR) LOGS */}
      <Card className="p-5 space-y-4" aria-labelledby={`${id}-dtr-title`}>
        <SectionHeading
          id={`${id}-dtr-title`}
          title="Daily Time Record (DTR)"
          action={
            <span className="text-xs font-semibold text-slate-600">
              Showing <strong>{filteredDtrRecords.length}</strong> of {logs.length} records
            </span>
          }
        />

        {/* Filters */}
        <div className="grid gap-3 sm:grid-cols-3">
          <SearchField
            inputRef={searchInputRef}
            label="Search DTR"
            placeholder="Search by date or task…"
            value={dtrQuery}
            onChange={e => setDtrQuery(e.target.value)}
            onClear={() => {
              setDtrQuery('');
              searchInputRef.current?.focus();
            }}
          />

          <Field
            label="Month"
            value={dtrPeriod}
            onChange={e => setDtrPeriod(e.target.value)}
            options={[
              { value: 'ALL', label: 'All months' },
              ...availablePeriods.map(p => ({ value: p.value, label: p.label }))
            ]}
          />

          <Field
            label="Status"
            value={dtrStatus}
            onChange={e => setDtrStatus(e.target.value)}
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'PENDING', label: 'Waiting for review' },
              { value: 'RETURNED', label: 'Needs changes' }
            ]}
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200">
          <table className="dtr-table w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-3.5 py-3">Date</th>
                <th className="px-3.5 py-3">AM In</th>
                <th className="px-3.5 py-3">AM Out</th>
                <th className="px-3.5 py-3">PM In</th>
                <th className="px-3.5 py-3">PM Out</th>
                <th className="px-3.5 py-3 text-right">Hours</th>
                <th className="px-3.5 py-3">Status</th>
                <th className="px-3.5 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDtrRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center">
                    <EmptyState
                      title="No records found"
                      description="No DTR entries match your selected filters."
                      action={
                        (dtrQuery || dtrPeriod !== 'ALL' || dtrStatus !== 'ALL') && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setDtrQuery('');
                              setDtrPeriod('ALL');
                              setDtrStatus('ALL');
                            }}
                          >
                            Reset filters
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredDtrRecords.map(item => {
                  const isExpanded = expandedRowId === item.id;
                  const isWeekly = item.kind === 'weekly_task';
                  return (
                    <Fragment key={item.id}>
                      <tr className="hover:bg-slate-50/80">
                        <td className="px-3.5 py-3 font-bold text-slate-900">
                          <div>{item.date}</div>
                          {isWeekly && (
                            <span className="mt-0.5 inline-block rounded bg-navy-50 px-1.5 py-0.5 text-xs font-semibold text-navy-900">
                              Competency Log
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 tabular-nums text-slate-700">
                          {item.amIn && item.amIn !== '-' ? item.amIn : '—'}
                        </td>
                        <td className="px-3.5 py-3 tabular-nums text-slate-700">
                          {item.amOut && item.amOut !== '-' ? item.amOut : '—'}
                        </td>
                        <td className="px-3.5 py-3 tabular-nums text-slate-700">
                          {item.pmIn && item.pmIn !== '-' ? item.pmIn : '—'}
                        </td>
                        <td className="px-3.5 py-3 tabular-nums text-slate-700">
                          {item.pmOut && item.pmOut !== '-' ? item.pmOut : '—'}
                        </td>
                        <td className="px-3.5 py-3 text-right font-extrabold tabular-nums text-navy-950">
                          {Number(item.hours || 0).toFixed(1)}
                        </td>
                        <td className="px-3.5 py-3">
                          <StatusBadge status={item.status} plain />
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? 'Hide' : 'Details'}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="dtr-expanded-row bg-slate-50">
                          <td colSpan="8" className="p-4">
                            <DtrRowDetails item={item} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (< 768px) */}
        <div className="space-y-3 md:hidden">
          {filteredDtrRecords.length === 0 ? (
            <EmptyState
              title="No records found"
              description="No DTR entries match your selected filters."
            />
          ) : (
            filteredDtrRecords.map(item => {
              const isExpanded = expandedRowId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{item.date}</p>
                      <p className="truncate text-xs text-slate-600">{item.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold tabular-nums text-navy-950">
                        {Number(item.hours || 0).toFixed(1)} hrs
                      </p>
                      <StatusBadge status={item.status} plain />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 border-y border-slate-100 py-2.5 text-center text-xs">
                    <div>
                      <span className="block text-slate-500">AM In</span>
                      <strong className="tabular-nums text-slate-900">
                        {item.amIn && item.amIn !== '-' ? item.amIn : '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">AM Out</span>
                      <strong className="tabular-nums text-slate-900">
                        {item.amOut && item.amOut !== '-' ? item.amOut : '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">PM In</span>
                      <strong className="tabular-nums text-slate-900">
                        {item.pmIn && item.pmIn !== '-' ? item.pmIn : '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-slate-500">PM Out</span>
                      <strong className="tabular-nums text-slate-900">
                        {item.pmOut && item.pmOut !== '-' ? item.pmOut : '—'}
                      </strong>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? 'Hide' : 'Details'}
                  </Button>

                  {isExpanded && (
                    <div className="dtr-expanded-row rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <DtrRowDetails item={item} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {filteredDtrRecords.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <div className="flex flex-wrap gap-4 font-bold text-slate-800">
              <span>Logged: {filteredRecordedTotal.toFixed(1)} hrs</span>
              <span>Approved: {filteredApprovedTotal.toFixed(1)} hrs</span>
              <span>Waiting for review: {filteredPendingTotal.toFixed(1)} hrs</span>
            </div>
            <span>Only approved hours count toward your total.</span>
          </div>
        )}
      </Card>

      {/* 4. TIME FIX REQUESTS */}
      <Card className="p-5 space-y-4" aria-labelledby={`${id}-adj-history-title`}>
        <SectionHeading
          id={`${id}-adj-history-title`}
          title="Time fix requests"
          description="Requests for missed time-in/out or off-site work."
          action={
            <Button variant="secondary" size="sm" onClick={() => setIsAdjustmentModalOpen(true)}>
              <Icon name="plus" size={15} />
              New request
            </Button>
          }
        />

        {disputes.length > 3 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <SearchField
              label="Search requests"
              placeholder="Search by date or reason…"
              value={adjQuery}
              onChange={e => setAdjQuery(e.target.value)}
              onClear={() => setAdjQuery('')}
            />
            <Field
              label="Status"
              value={adjStatus}
              onChange={e => setAdjStatus(e.target.value)}
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'Pending Supervisor Verification', label: 'Waiting for review' },
                { value: 'Supervisor Verified', label: 'Approved by supervisor' },
                { value: 'Coordinator Approved', label: 'Approved by coordinator' },
                { value: 'Returned for Revision', label: 'Needs changes' }
              ]}
            />
          </div>
        )}

        {filteredAdjustments.length === 0 ? (
          <EmptyState
            title="No time fix requests"
            description="Missed a time-in or worked off-site? Request a time fix above."
          />
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {filteredAdjustments.map(item => {
              const isExpanded = expandedAdjId === item.id;
              return (
                <li key={item.id} className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900">
                          {item.targetDate}
                        </strong>
                        <span className="text-xs font-bold text-navy-900">
                          · {item.requestedHours} hrs
                        </span>
                        <StatusBadge status={item.status} plain />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        {item.reasonCategory || 'Schedule adjustment'}
                      </p>
                      <p className="text-xs text-slate-600">{item.reason}</p>
                    </div>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => setExpandedAdjId(isExpanded ? null : item.id)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? 'Hide' : 'Details'}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 sm:grid-cols-2">
                      <div>
                        <p className="font-bold text-slate-900">Requested times</p>
                        <p className="mt-0.5">
                          AM: {item.requestedAmIn || '08:00 AM'} – {item.requestedAmOut || '12:00 PM'}{' '}
                          · PM: {item.requestedPmIn || '01:00 PM'} –{' '}
                          {item.requestedPmOut || '05:00 PM'}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Reviewer notes</p>
                        <p className="mt-0.5">
                          {item.supervisorRemarks ||
                            item.remarks ||
                            item.coordinatorRemarks ||
                            'No notes yet.'}
                        </p>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* 5. FIX MISSED TIME MODAL */}
      {isAdjustmentModalOpen && (
        <Modal title="Request a time fix" onClose={() => setIsAdjustmentModalOpen(false)}>
          <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label="Date"
                type="date"
                max={getTodayDateString()}
                required
                value={adjForm.targetDate}
                onChange={e => setAdjForm(prev => ({ ...prev, targetDate: e.target.value }))}
                disabled={busy}
              />
              <Field
                label="Reason type"
                value={adjForm.reasonCategory}
                onChange={e => setAdjForm(prev => ({ ...prev, reasonCategory: e.target.value }))}
                options={ADJUSTMENT_CATEGORIES}
                disabled={busy}
              />
              <Field
                label="Hours (1–12)"
                type="number"
                min="1"
                max="12"
                required
                value={adjForm.requestedHours}
                onChange={e => setAdjForm(prev => ({ ...prev, requestedHours: e.target.value }))}
                disabled={busy}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
              <Field
                label="AM In"
                type="text"
                value={adjForm.requestedAmIn}
                onChange={e => setAdjForm(prev => ({ ...prev, requestedAmIn: e.target.value }))}
                disabled={busy}
              />
              <Field
                label="AM Out"
                type="text"
                value={adjForm.requestedAmOut}
                onChange={e => setAdjForm(prev => ({ ...prev, requestedAmOut: e.target.value }))}
                disabled={busy}
              />
              <Field
                label="PM In"
                type="text"
                value={adjForm.requestedPmIn}
                onChange={e => setAdjForm(prev => ({ ...prev, requestedPmIn: e.target.value }))}
                disabled={busy}
              />
              <Field
                label="PM Out"
                type="text"
                value={adjForm.requestedPmOut}
                onChange={e => setAdjForm(prev => ({ ...prev, requestedPmOut: e.target.value }))}
                disabled={busy}
              />
            </div>

            <Field
              label="What happened?"
              multiline
              rows={3}
              required
              minLength={10}
              placeholder="Explain why you missed the time-in/out (for example, off-site work or camera issue)…"
              value={adjForm.reason}
              onChange={e => setAdjForm(prev => ({ ...prev, reason: e.target.value }))}
              disabled={busy}
            />

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setIsAdjustmentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !adjForm.reason.trim()}>
                {busy ? 'Sending…' : 'Send request'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 6. DTR EXPORT & PRINT MODAL */}
      {isExportOpen && (
        <Modal title="Export Daily Time Record (DTR)" onClose={() => setIsExportOpen(false)}>
          <StudentAttendanceDtrModal
            user={user}
            db={db}
            records={logs}
            period={dtrPeriod}
            onClose={() => setIsExportOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}

function DtrRowDetails({ item }) {
  return (
    <div className="grid gap-4 text-xs text-slate-700 sm:grid-cols-2">
      <div className="space-y-1">
        <h4 className="font-bold text-slate-900">Work summary</h4>
        <p className="font-semibold text-navy-950">{item.title}</p>
        <p>{item.description || 'No additional notes recorded.'}</p>
        {item.competencyTag && (
          <p className="text-slate-500">
            Skill area: <strong className="text-slate-700">{item.competencyTag}</strong>
          </p>
        )}
      </div>

      <div className="space-y-1">
        <h4 className="font-bold text-slate-900">Review status</h4>
        <p>
          <strong>Supervisor:</strong>{' '}
          {item.supervisorVerifiedBy ? `Approved by ${item.supervisorVerifiedBy}` : 'Waiting for review'}
        </p>
        {item.coordinatorApprovedBy && (
          <p>
            <strong>Coordinator:</strong> Approved by {item.coordinatorApprovedBy}
          </p>
        )}
        {item.remarks && <p className="italic text-slate-600">&ldquo;{item.remarks}&rdquo;</p>}
        {item.photo && (
          <img
            src={item.photo}
            alt="Attendance photo"
            className="mt-2 max-w-[140px] rounded-md border border-slate-300"
          />
        )}
      </div>
    </div>
  );
}
