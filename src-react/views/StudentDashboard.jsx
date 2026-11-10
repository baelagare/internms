import { useMemo, useState } from 'react';
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
import { Modal } from '../components/workflow.jsx';
import { EvaluationDetails } from './Evaluations.jsx';
import { dashboardSummary, statusTone } from '../services/studentDashboard.js';
import { computeSbertPlacementRankings } from '../../src/services/sbertEngine.js';

export function StudentDashboard({ user, db, onNavigate }) {
  const [preview, setPreview] = useState(false);
  const { verified, required, hours, quota, percent, evaluation, alerts, steps } =
    dashboardSummary(user, db);
  const completed = steps.filter(step => step.status === 'Completed').length;
  const nextStep =
    steps.find(step => step.status === 'Requires Attention') ||
    steps.find(step => step.status !== 'Completed') ||
    steps[steps.length - 1];

  const recommendation = useMemo(() => {
    if (!Array.isArray(db.htes)) return { error: 'Recommendation records are unavailable.' };
    try {
      return { match: computeSbertPlacementRankings(user, db.htes, db.collegeSettings || {})[0] };
    } catch {
      return {
        error: 'Recommendations could not be calculated. Review your profile and placement records.'
      };
    }
  }, [user, db.htes, db.collegeSettings]);

  const company = user.company && !/^unassigned/i.test(user.company) ? user.company : '';
  const deployed = user.placementStatus === 'Approved & Deployed';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Dashboard"
        action={
          deployed ? (
            <Button onClick={() => onNavigate('attendance')}>
              <Icon name="clock" size={16} />
              Time in / out
            </Button>
          ) : null
        }
      />

      {/* Primary Action: Next Step */}
      {nextStep && (
        <Card className="border-l-4 border-l-gold-500 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-800">
                  Next step
                </span>
                <StatusBadge status={nextStep.status} tone={statusTone(nextStep.status)} plain />
              </div>
              <h2 className="text-lg font-bold text-navy-950">{nextStep.title}</h2>
              <p className="text-sm text-slate-600">{nextStep.detail}</p>
            </div>
            <Button onClick={() => onNavigate(nextStep.route)}>
              <span>{nextStep.action}</span>
              <Icon name="arrow" size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* Compact Summary Strip */}
      <Card className="p-5" aria-label="Internship summary">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Documents"
            value={`${verified} / ${required ?? '—'}`}
            badge={
              <StatusBadge
                plain
                status={
                  required == null
                    ? 'Unavailable'
                    : verified === required
                    ? 'Verified'
                    : 'Pending Verification'
                }
              />
            }
            detail={required == null ? 'Requirements unavailable' : 'Pre-deployment checklist'}
          />

          <div className="border-b border-slate-200 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">OJT hours</p>
              <Icon name="clock" size={16} className="text-slate-400" />
            </div>
            <p className="mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums text-navy-950">
              {hours ?? '—'} / {quota ?? '—'}
            </p>
            {percent != null ? (
              <div className="mt-2 space-y-1">
                <ProgressBar label="Approved OJT hours" value={percent} max={100} />
                <p className="text-xs text-slate-600">{percent}% completed · approved hours</p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-600">Hour records unavailable</p>
            )}
          </div>

          <Metric
            label="Placement"
            value={company || 'Not placed'}
            badge={<StatusBadge plain status={user.placementStatus || 'Unplaced'} />}
            detail={company ? user.assignedRole || 'Host company assigned' : 'No company assigned yet'}
          />

          <Metric
            label="Clearance"
            value={user.clearanceStatus === 'Cleared & Certified' ? 'Cleared' : 'In progress'}
            badge={<StatusBadge plain status={user.clearanceStatus || 'Pre-Deployment'} />}
            detail={
              user.clearanceStatus === 'Cleared & Certified'
                ? 'Signed off by coordinator'
                : 'Needs hours, evaluation, and sign-off'
            }
          />
        </div>
      </Card>

      {/* Advisories (shown above details when present so warnings aren't missed) */}
      <Card className="p-5" aria-labelledby="advisories-heading">
        <SectionHeading
          id="advisories-heading"
          title="Notices from your coordinator"
          description={
            alerts.length
              ? `${alerts.length} active ${alerts.length === 1 ? 'notice' : 'notices'}`
              : undefined
          }
        />
        {!Array.isArray(db.alerts) ? (
          <p className="text-sm text-slate-600">Notice records are unavailable.</p>
        ) : alerts.length ? (
          <div className="space-y-3">
            {alerts.map(alert => (
              <Advisory
                key={alert.id}
                alert={alert}
                corpus={db.policyCorpus || []}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="check"
            title="You're all caught up"
            description="No active notices from your coordinator."
          />
        )}
      </Card>

      {/* Six-step OJT Progress */}
      <Card className="p-5" aria-labelledby="milestones-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="milestones-heading" className="text-lg font-bold text-slate-900">
              Your OJT steps
            </h2>
            <p className="text-xs text-slate-600">{completed} of 6 milestones completed</p>
          </div>
          <div className="w-40">
            <ProgressBar label="Internship milestones" value={completed} max={6} />
          </div>
        </div>

        <ol className="divide-y divide-slate-200">
          {steps.map((step, index) => {
            const isDone = step.status === 'Completed';
            return (
              <li
                key={step.title}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-bold ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-800'
                        : step.status === 'Requires Attention'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isDone ? <Icon name="check" size={14} /> : index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                      <StatusBadge status={step.status} tone={statusTone(step.status)} plain />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">{step.detail}</p>
                  </div>
                </div>
                <Button variant="quiet" size="sm" onClick={() => onNavigate(step.route)}>
                  <span>{step.action}</span>
                  <Icon name="arrow" size={14} />
                </Button>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* Placement & Evaluation Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PlacementCard
          user={user}
          company={company}
          recommendation={recommendation}
          onNavigate={onNavigate}
        />
        <EvaluationCard
          evaluation={evaluation}
          available={Array.isArray(db.evaluations)}
          onPreview={() => setPreview(true)}
        />
      </div>

      {preview && evaluation && (
        <Modal title="Supervisor evaluation" onClose={() => setPreview(false)}>
          <EvaluationDetails evaluation={evaluation} />
          <div className="flex justify-end pt-2">
            <Button onClick={() => window.print()}>
              <Icon name="printer" size={16} />
              Print evaluation
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PlacementCard({ user, company, recommendation, onNavigate }) {
  const { match, error } = recommendation;
  return (
    <Card className="flex flex-col justify-between p-5" aria-labelledby="placement-heading">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="placement-heading" className="text-lg font-bold text-slate-900">
              Placement
            </h2>
            <p className="mt-1 text-base font-bold text-navy-950">
              {company || 'No company assigned yet'}
            </p>
            <p className="text-sm text-slate-600">
              {company
                ? user.assignedRole || 'Intern'
                : 'Choose a preferred company so your coordinator can place you.'}
            </p>
          </div>
          <StatusBadge plain status={user.placementStatus || 'Unplaced'} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Top match for your skills
            </span>
            {match && (
              <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-bold text-navy-900">
                {match.matchPercent}% match
              </span>
            )}
          </div>
          {match ? (
            <div className="mt-1.5 space-y-1.5">
              <p className="text-sm font-bold text-slate-900">{match.company}</p>
              <p className="text-xs text-slate-600">{match.reasoning}</p>
              <HelpTip label="How matching works">
                Matches compare your skills, completed courses, and program with each company's
                requirements. Your coordinator makes the final placement decision.
              </HelpTip>
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-600">
              {error || 'No company matches are available right now.'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-2">
        <Button variant="secondary" onClick={() => onNavigate('placement')}>
          <span>{company ? 'View placement details' : 'Browse companies'}</span>
          <Icon name="arrow" size={16} />
        </Button>
      </div>
    </Card>
  );
}

function EvaluationCard({ evaluation, available, onPreview }) {
  return (
    <Card className="flex flex-col justify-between p-5" aria-labelledby="evaluation-heading">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id="evaluation-heading" className="text-lg font-bold text-slate-900">
            Supervisor evaluation
          </h2>
          {evaluation && (
            <StatusBadge
              tone={/^Passed\b/i.test(evaluation.recommendation || '') ? 'success' : 'neutral'}
            >
              {evaluation.recommendation?.split(/[—·]/)[0].trim() || 'Recorded'}
            </StatusBadge>
          )}
        </div>

        {evaluation ? (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-navy-950">
                {evaluation.totalScore ?? '—'}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                / {evaluation.maxScore ?? '—'} points
              </span>
              {evaluation.equivalentRating && (
                <span className="text-xs font-semibold text-slate-600">
                  · {evaluation.equivalentRating}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-700">
              {evaluation.recommendation || 'No recommendation recorded.'}
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <strong className="font-bold text-slate-800">Final clearance: </strong>
              {evaluation.coordinatorClearanceStatus || 'Waiting for coordinator sign-off.'}
            </div>
          </div>
        ) : (
          <EmptyState
            title={available ? 'Not evaluated yet' : 'Evaluation unavailable'}
            description={
              available
                ? 'Your supervisor will submit your evaluation near the end of your OJT.'
                : 'Evaluation data could not be loaded. Reload the page to try again.'
            }
          />
        )}
      </div>

      {evaluation && (
        <div className="mt-4 pt-2">
          <Button variant="secondary" onClick={onPreview}>
            <span>View Evaluation Rubric</span>
            <Icon name="arrow" size={16} />
          </Button>
        </div>
      )}
    </Card>
  );
}

function Advisory({ alert, corpus, onNavigate }) {
  const severity = String(alert.severity || 'Information');
  const tone = /critical/i.test(severity)
    ? 'danger'
    : /warning|caution/i.test(severity)
    ? 'warning'
    : 'neutral';
  const evidence = alert.evidence || {};
  const dispatched = /dispatched/i.test(alert.hitlStatus || alert.status || '');
  const clauses = (alert.retrievedClauseIds || []).map(id => ({
    id,
    record: corpus.find(item => item.chunkId === id)
  }));
  const route = /ATTENDANCE/i.test(alert.ruleId || '')
    ? 'attendance'
    : /DOC/i.test(alert.ruleId || '')
    ? 'checklist'
    : 'tasks';

  const borderStyle =
    tone === 'danger'
      ? 'border-red-200 bg-red-50/40'
      : tone === 'warning'
      ? 'border-amber-200 bg-amber-50/40'
      : 'border-slate-200 bg-slate-50';

  return (
    <article className={`rounded-xl border p-4 space-y-3 ${borderStyle}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon
            name="alert"
            size={18}
            className={tone === 'danger' ? 'text-red-700' : 'text-amber-700'}
          />
          <h3 className="text-sm font-bold text-slate-900">
            {alert.ruleLabel || 'Notice from your coordinator'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={tone}>{severity}</StatusBadge>
          {!dispatched && <StatusBadge tone="neutral">Waiting for coordinator review</StatusBadge>}
        </div>
      </div>

      {alert.triggers?.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
          {alert.triggers.map(trigger => (
            <li key={trigger}>{trigger}</li>
          ))}
        </ul>
      )}

      {evidence.absenceDates?.length > 0 && (
        <p className="text-xs text-slate-600">
          <strong className="font-bold text-slate-800">Dates missed:</strong>{' '}
          {evidence.absenceDates.join(', ')}
        </p>
      )}

      {evidence.loggedHours != null && evidence.expectedHoursByWeek6 != null && (
        <p className="text-xs text-slate-600">
          <strong className="font-bold text-slate-800">Hours logged when issued:</strong>{' '}
          {evidence.loggedHours} of {evidence.expectedHoursByWeek6} expected hours.
        </p>
      )}

      <details className="advisory-details rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
        <summary className="cursor-pointer font-bold text-navy-800">
          {dispatched ? 'Read full message' : 'Read draft message'}
        </summary>
        <p className="notice-text mt-2 whitespace-pre-wrap leading-relaxed">
          {alert.finalDispatchedText || alert.draftMessage || 'No message recorded.'}
        </p>
        {clauses.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-slate-200 pt-2">
            <p className="font-bold text-slate-800">Related school policy</p>
            {clauses.map(({ id, record }) => (
              <blockquote
                key={id}
                className="border-l-2 border-slate-300 pl-3 text-xs text-slate-600"
              >
                <strong className="block text-slate-800">
                  {record ? `${record.sourceDoc} · ${record.sectionRef}` : id}
                </strong>
                {record?.verbatimText && <p className="mt-0.5">{record.verbatimText}</p>}
              </blockquote>
            ))}
          </div>
        )}
      </details>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="secondary" size="sm" onClick={() => onNavigate(route)}>
          Open {route === 'tasks' ? 'task logs' : route}
        </Button>
        <Button variant="quiet" size="sm" onClick={() => onNavigate('messages')}>
          Message coordinator
        </Button>
      </div>
    </article>
  );
}
