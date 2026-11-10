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
          className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1"
        >
          <div className="flex items-center justify-between gap-2">
            <dt className="font-bold text-slate-700">{row.label}</dt>
            <span
              className={`inline-flex items-center gap-1 font-bold ${
                row.pass === true
                  ? 'text-emerald-700'
                  : row.pass === false
                  ? 'text-red-700'
                  : 'text-slate-500'
              }`}
            >
              {row.pass === true ? (
                <>
                  <Icon name="check" size={13} />
                  {row.key === 'checklist' ? 'Approved' : 'Met'}
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
          <dd className="text-slate-600 leading-relaxed">{row.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

function Tags({ values, empty, tone = '' }) {
  return values?.length ? (
    <ul className="placement-tags flex flex-wrap gap-1.5">
      {values.map((value, index) => (
        <li
          key={`${value}-${index}`}
          className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
            tone === 'gap'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-slate-200 bg-white text-slate-800'
          }`}
        >
          {value}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-xs text-slate-500">{empty}</p>
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
      className={`placement-opportunity p-5 space-y-4 ${
        current ? 'placement-opportunity-current border-navy-700 ring-1 ring-navy-700/20' : ''
      }`}
      aria-labelledby={`${id}-title`}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="placement-rank rounded-md bg-navy-50 px-2 py-0.5 text-xs font-bold text-navy-900">
              Rank #{match.rank}
            </span>
            <StatusBadge status={eligibility.label} tone={eligibility.tone} />
            {current && <StatusBadge tone="blue">Current placement</StatusBadge>}
          </div>
          <h3 id={`${id}-title`} className="text-lg font-extrabold text-navy-950">
            {match.company || 'Organization name not recorded'}
          </h3>
          <p className="text-sm font-medium text-slate-700">
            {match.roleTitle || 'Internship role not recorded'}
          </p>
        </div>

        <div className="placement-score w-full sm:w-44 sm:text-right">
          {score === null ? (
            <p className="text-xs text-slate-500">Match score unavailable</p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between sm:justify-end gap-1.5">
                <strong className="text-2xl font-extrabold tabular-nums text-navy-950">
                  {score}%
                </strong>
                <span className="text-xs font-semibold text-slate-500">match</span>
              </div>
              <progress
                value={score}
                max="100"
                aria-label={`${match.company}: ${score}% profile match`}
                className="sr-only"
              >
                {score}%
              </progress>
              <ProgressBar label={`${match.company} match`} value={score} max={100} />
            </div>
          )}
        </div>
      </header>

      <ul className="placement-metadata flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-600">
        <li className="inline-flex items-center gap-1.5">
          <Icon name="building" size={15} className="text-slate-400" />
          {match.location || 'Location not recorded'}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Icon name="users" size={15} className="text-slate-400" />
          {capacity
            ? `${capacity.available} ${
                capacity.available === 1 ? 'slot' : 'slots'
              } available · ${capacity.occupied}/${capacity.total} occupied`
            : 'Slot availability unknown'}
        </li>
        {match.supervisorName && (
          <li className="inline-flex items-center gap-1.5">
            <Icon name="user" size={15} className="text-slate-400" />
            {match.supervisorName}
          </li>
        )}
      </ul>

      <p className="text-sm text-slate-700">
        {match.description || 'No internship description recorded.'}
      </p>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span className="rounded-md bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">
          <strong>
            {matched.length} of{' '}
            {Array.isArray(host?.requiredSkills) ? host.requiredSkills.length : '—'}
          </strong>{' '}
          required skills matched
        </span>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">
          <strong>{courses.length}</strong> relevant {courses.length === 1 ? 'course' : 'courses'}
        </span>
      </div>

      {eligibility.issues.length > 0 && (
        <ul className="placement-issues list-disc rounded-lg border border-amber-200 bg-amber-50/60 py-2.5 pl-8 pr-4 text-xs text-amber-900 space-y-1">
          {eligibility.issues.map(issue => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}

      <details className="placement-opportunity-details rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-1">
        <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 text-xs font-bold text-navy-800">
          <span>
            Skills, courses &amp; requirements
            <span className="sr-only"> for {match.company}</span>
          </span>
          <Icon name="chevron" size={16} />
        </summary>

        <div className="placement-expanded space-y-4 border-t border-slate-200 py-4">
          <div className="placement-skill-columns grid gap-4 sm:grid-cols-2">
            <section className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Matched skills ({matched.length})
              </h4>
              <Tags values={matched} empty="No required skills matched your profile." />
            </section>
            <section className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Skills to build ({gaps.length})
              </h4>
              <Tags values={gaps} tone="gap" empty="No skill gaps identified." />
            </section>
          </div>

          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Relevant courses
            </h4>
            <Tags values={courses} empty="No matching courses identified." />
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Company requirements
            </h4>
            <EligibilityList rows={rows} />
          </section>
        </div>
      </details>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <p id={`${id}-action`} className="text-xs text-slate-600">
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
