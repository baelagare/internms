import { useId } from 'react';
import { Button, Card, ProgressBar, StatusBadge } from '../components/ui.jsx';
import { Icon } from '../components/Icons.jsx';
import {
  assignedCompany,
  eligibilityRows,
  eligibilitySummary,
  hostCapacity,
  placementAction,
  validMatchPercent
} from '../services/studentPlacement.js';

export function EligibilityList({ rows, overview = false }) {
  return (
    <dl className={`grid gap-3 ${overview ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-2'}`}>
      {rows.map(row => (
        <div
          key={row.key}
          className="rounded-panel border border-line bg-subtle p-3.5 text-xs space-y-1.5"
        >
          <div className="flex items-center justify-between gap-2">
            <dt className="font-semibold text-ink">{row.label}</dt>
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                row.pass === true
                  ? 'text-success'
                  : row.pass === false
                  ? 'text-danger'
                  : 'text-muted'
              }`}
            >
              {row.pass === true ? (
                <>
                  <Icon name="check" size={13} />
                  {row.key === 'checklist' ? 'Verified' : 'Met'}
                </>
              ) : row.pass === false ? (
                <>
                  <Icon name="alert" size={13} />
                  {row.key === 'checklist' ? 'Incomplete' : 'Not met'}
                </>
              ) : overview && ['college', 'capacity'].includes(row.key) ? (
                'Per company'
              ) : (
                'Check record'
              )}
            </span>
          </div>
          <dd className="text-muted leading-relaxed">{row.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

function Tags({ values = [], empty = 'None', tone = '' }) {
  return values?.length ? (
    <ul className="flex flex-wrap gap-1.5">
      {values.map((value, index) => (
        <li
          key={`${value}-${index}`}
          className={`rounded-control border px-2.5 py-1 text-xs font-semibold ${
            tone === 'gap'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-line bg-surface text-ink shadow-sm'
          }`}
        >
          {value}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-xs text-muted">{empty}</p>
  );
}


export function OpportunityCard({ match, host, student, settings, onRequest }) {
  const id = useId();
  const current = assignedCompany(student) === match.company;
  const score = validMatchPercent(match.matchPercent);
  const capacity = hostCapacity(host);
  const rows = eligibilityRows(student, host, settings, match.eligibility);
  const eligibility = eligibilitySummary(rows, match.eligibility);
  const action = placementAction(student, match);
  const matched = match.matchingSkills || [];
  const gaps = match.skillsGap || [];
  const courses = match.matchingCoursework || [];

  return (
    <Card
      className={`p-6 space-y-4 ${
        current ? 'border-accent bg-accent-subtle/20' : ''
      }`}
      aria-labelledby={`${id}-title`}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {match.rank != null && (
              <span className="ds-badge ds-tone--neutral">
                Option #{match.rank}
              </span>
            )}
            <StatusBadge status={eligibility.label} tone={eligibility.tone} />
            {current && <StatusBadge tone="info">Current placement</StatusBadge>}
          </div>
          <h3 id={`${id}-title`} className="text-lg font-semibold text-ink">
            {match.company || 'Organization name not recorded'}
          </h3>
          <p className="text-sm font-medium text-muted">
            {match.roleTitle || 'Internship role not recorded'}
          </p>
        </div>


        <div className="w-full sm:w-44 sm:text-right">
          {score === null ? (
            <p className="text-xs text-muted">Match score unavailable</p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between sm:justify-end gap-1.5">
                <strong className="text-2xl font-bold tabular-nums text-ink">
                  {score}%
                </strong>
                <span className="text-xs font-semibold text-muted">alignment</span>
              </div>
              <ProgressBar label={`${match.company} alignment`} value={score} max={100} />
            </div>
          )}
        </div>
      </header>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted">
        <li className="inline-flex items-center gap-1.5">
          <Icon name="building" size={15} className="text-muted" />
          {match.location || 'Location not recorded'}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Icon name="users" size={15} className="text-muted" />
          {capacity
            ? `${capacity.available} ${
                capacity.available === 1 ? 'slot' : 'slots'
              } open · ${capacity.occupied}/${capacity.total} filled`
            : 'Slot availability not recorded'}
        </li>
        {match.supervisorName && (
          <li className="inline-flex items-center gap-1.5">
            <Icon name="user" size={15} className="text-muted" />
            {match.supervisorName}
          </li>
        )}
      </ul>

      <p className="text-sm text-ink leading-relaxed">
        {match.description || 'No internship role description recorded.'}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="rounded-control border border-line bg-subtle px-2.5 py-1 font-semibold text-ink">
          <strong>
            {matched.length} of{' '}
            {Array.isArray(host?.requiredSkills) ? host.requiredSkills.length : '—'}
          </strong>{' '}
          required skills aligned
        </span>
        <span className="rounded-control border border-line bg-subtle px-2.5 py-1 font-semibold text-ink">
          <strong>{courses.length}</strong> relevant {courses.length === 1 ? 'course' : 'courses'}
        </span>
      </div>


      {eligibility.issues.length > 0 && (
        <ul className="list-disc rounded-panel border border-amber-200 bg-amber-50/60 py-2.5 pl-8 pr-4 text-xs text-amber-900 space-y-1">
          {eligibility.issues.map(issue => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}

      <details className="rounded-panel border border-line bg-subtle px-4 py-1">
        <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-ink">
          <span>
            Requirements &amp; skill details
            <span className="sr-only"> for {match.company}</span>
          </span>
          <Icon name="chevron" size={16} />
        </summary>

        <div className="space-y-4 border-t border-line py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Matched skills ({matched.length})
              </h4>
              <Tags values={matched} empty="No required skills matched your profile." />
            </section>
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Skills to build ({gaps.length})
              </h4>
              <Tags values={gaps} tone="gap" empty="No skill gaps identified." />
            </section>
          </div>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Relevant courses
            </h4>
            <Tags values={courses} empty="No matching courses identified." />
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Company eligibility
            </h4>
            <EligibilityList rows={rows} />
          </section>
        </div>
      </details>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <p id={`${id}-action`} className="text-xs text-muted">
          {action.detail}
        </p>
        <Button
          variant={current || action.disabled ? 'secondary' : 'primary'}
          disabled={action.disabled}
          aria-describedby={`${id}-action`}
          onClick={onRequest}
        >
          {action.label}
        </Button>
      </footer>
    </Card>
  );
}

