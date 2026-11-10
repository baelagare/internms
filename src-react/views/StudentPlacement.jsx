import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SectionHeading,
  StatusBadge
} from '../components/ui.jsx';
import { Icon } from '../components/Icons.jsx';
import { Field, Modal, useMutation } from '../components/workflow.jsx';
import { savePlacement } from '../services/applicationService.js';
import {
  assignedCompany,
  eligibilityRows,
  placementRecommendations,
  visibleRecommendations
} from '../services/studentPlacement.js';
import { OpportunityCard, EligibilityList } from './StudentPlacementCards.jsx';

export function StudentPlacement({ user, db, onChange }) {
  const student = db.users.find(item => item.id === user.id && item.role === 'student');
  if (!student) {
    return (
      <EmptyState
        title="Student placement record unavailable"
        description="Your student record could not be found. Sign in again or contact your coordinator."
      />
    );
  }
  return <PlacementWorkspace student={student} db={db} onChange={onChange} />;
}

function PlacementWorkspace({ student, db, onChange }) {
  const [sort, setSort] = useState('recommended');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [feedback, setFeedback] = useState('');

  const result = useMemo(
    () => placementRecommendations(student, db),
    [student, db.htes, db.collegeSettings]
  );
  const hosts = Array.isArray(db.htes) ? db.htes : [];
  const visible = visibleRecommendations(
    result.matches,
    hosts,
    student,
    db.collegeSettings,
    sort,
    filter
  );
  const selected = result.matches.find(match => match.hteId === selectedId);
  const company = assignedCompany(student);
  const assigned = hosts.find(host => host.name === company);
  const deployed = student.placementStatus === 'Approved & Deployed';
  const pending = student.placementStatus === 'Pending Coordinator Endorsement';
  const missingSkills = !student.portfolioData?.skills?.length;
  const missingCourses = !student.portfolioData?.coursework?.length;

  function clearFilters() {
    setFilter('all');
    setSort('recommended');
  }

  return (
    <div className="student-placement space-y-6">
      <PageHeader
        title="Placement Management"
        badge={<StatusBadge plain status={student.placementStatus || 'Unplaced'} />}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              window.location.hash = '#/student/messages';
            }}
          >
            <Icon name="chat" size={16} />
            Message coordinator
          </Button>
        }
      />

      {feedback && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback('')}
            aria-label="Dismiss message"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md opacity-70 hover:opacity-100"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* Current Placement Hero Card */}
      <Card
        className={`placement-current p-5 space-y-4 ${
          deployed ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-gold-500'
        }`}
        aria-labelledby="current-placement-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              <span id="current-placement-heading">Your placement</span>
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-navy-950">
              {company || 'No company assigned yet'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {company
                ? student.assignedRole || assigned?.roleTitle || 'Intern'
                : pending
                ? 'Your preferred company is waiting for coordinator review.'
                : 'Choose a preferred company below so your coordinator can review it.'}
            </p>
          </div>
          <StatusBadge
            plain
            status={student.placementStatus || 'Unplaced'}
            tone={deployed ? 'success' : pending ? 'warning' : 'neutral'}
          />
        </div>

        {(company || student.preferredHte) && (
          <dl className="grid gap-3 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {company && (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Location
                </dt>
                <dd className="mt-0.5 font-semibold text-slate-900">
                  {assigned?.location || 'Not recorded'}
                </dd>
              </div>
            )}
            {company && (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Supervisor
                </dt>
                <dd className="mt-0.5 font-semibold text-slate-900">
                  {assigned?.supervisorName || 'Not recorded'}
                </dd>
              </div>
            )}
            {student.preferredHte && student.preferredHte !== company && (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Saved preference
                </dt>
                <dd className="mt-0.5 font-semibold text-slate-900">
                  {student.preferredHte}
                  {student.preferredRole && (
                    <span className="block text-xs font-normal text-slate-600">
                      {student.preferredRole}
                    </span>
                  )}
                </dd>
              </div>
            )}
            {student.deploymentStartDate && (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Start date
                </dt>
                <dd className="mt-0.5 font-semibold text-slate-900">
                  {student.deploymentStartDate}
                </dd>
              </div>
            )}
          </dl>
        )}
      </Card>

      {/* Compact Readiness Strip */}
      <Card className="p-5 space-y-3" aria-labelledby="placement-eligibility-heading">
        <SectionHeading
          id="placement-eligibility-heading"
          title="Your readiness"
          action={
            <Button
              variant="quiet"
              size="sm"
              onClick={() => {
                window.location.hash = '#/student/checklist';
              }}
            >
              <span>Open checklist</span>
              <Icon name="arrow" size={14} />
            </Button>
          }
        />
        <EligibilityList rows={eligibilityRows(student, null, db.collegeSettings)} overview />
      </Card>

      {/* Recommended Opportunities */}
      <section className="space-y-4" aria-labelledby="recommendations-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 id="recommendations-heading" className="text-lg font-bold text-slate-900">
              {deployed ? 'Other host companies' : 'Recommended companies'}
            </h2>
            <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-bold text-navy-900">
              {result.matches.length} {result.matches.length === 1 ? 'match' : 'matches'}
            </span>
          </div>

          <details className="placement-explanation text-xs text-slate-600">
            <summary className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 font-bold text-navy-700 hover:underline">
              <Icon name="help" size={15} />
              <span>How matching works</span>
            </summary>
            <div className="mt-2 max-w-xl rounded-lg border border-slate-200 bg-white p-3 leading-relaxed text-slate-600 shadow-sm">
              Matches compare your skills (36%), completed courses (12%), and profile similarity
              (52%) with each company's requirements. Eligible companies in your college appear
              first. Your coordinator makes the final placement decision.
            </div>
          </details>
        </div>

        {(missingSkills || missingCourses || !student.program) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-2.5">
              <Icon name="alert" size={18} className="mt-0.5 flex-none text-amber-700" />
              <p>
                <strong>Complete your profile for better matches.</strong>{' '}
                {missingSkills && 'No skills are recorded. '}
                {missingCourses && 'No coursework is recorded. '}
                {!student.program && 'Your degree program is missing. '}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                window.location.hash = '#/student/profile';
              }}
            >
              Update profile
            </Button>
          </div>
        )}

        {/* Filter & Sort Toolbar */}
        <Card className="placement-toolbar p-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 max-w-xl">
              <Field
                label="Show"
                value={filter}
                onChange={event => setFilter(event.target.value)}
                options={[
                  { value: 'all', label: 'All companies' },
                  { value: 'eligible', label: 'Eligible for me' },
                  { value: 'available', label: 'Open slots only' }
                ]}
              />
              <Field
                label="Sort by"
                value={sort}
                onChange={event => setSort(event.target.value)}
                options={[
                  { value: 'recommended', label: 'Recommended' },
                  { value: 'highest', label: 'Highest match' },
                  { value: 'lowest', label: 'Lowest match' },
                  { value: 'name', label: 'Company name' }
                ]}
              />
            </div>
            <p role="status" className="text-xs font-semibold text-slate-600">
              Showing {visible.length} of {result.matches.length}
            </p>
          </div>
        </Card>

        {result.error ? (
          <Card className="p-6 space-y-3" role="alert">
            <h3 className="text-base font-bold text-slate-900">Recommendations unavailable</h3>
            <p className="text-sm text-slate-600">{result.error}</p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </Card>
        ) : !result.matches.length ? (
          <EmptyState
            title={hosts.length ? 'No recommendation results' : 'No host organizations available'}
            description="No companies can be shown right now. Contact your coordinator for help."
          />
        ) : !visible.length ? (
          <EmptyState
            title="No opportunities match this filter"
            description="Reset the filters to see all available companies."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Reset filters
              </Button>
            }
          />
        ) : (
          <ol className="space-y-4" aria-label="Ranked internship opportunities">
            {visible.map(match => (
              <li key={match.hteId}>
                <OpportunityCard
                  match={match}
                  host={hosts.find(host => host.id === match.hteId)}
                  student={student}
                  settings={db.collegeSettings}
                  onRequest={() => setSelectedId(match.hteId)}
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      {selected && (
        <PlacementRequest
          student={student}
          match={selected}
          onChange={onChange}
          onClose={() => setSelectedId(null)}
          onSuccess={() => {
            setSelectedId(null);
            setFeedback(`Preference for ${selected.company} sent for coordinator review.`);
          }}
        />
      )}
    </div>
  );
}

function PlacementRequest({ student, match, onChange, onClose, onSuccess }) {
  const { run, busy, notice } = useMutation(onChange);
  return (
    <Modal
      title="Submit placement preference?"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="space-y-4"
        aria-busy={busy}
        onSubmit={async event => {
          event.preventDefault();
          if (
            await run(
              () => savePlacement(student, student.id, match.hteId),
              'Preference saved for coordinator review.'
            )
          ) {
            onSuccess();
          }
        }}
      >
        <div>
          <h3 className="text-base font-bold text-navy-950">{match.company}</h3>
          <p className="text-sm text-slate-600">{match.roleTitle}</p>
        </div>
        <p className="text-sm text-slate-700">
          Your coordinator will review this preference before assigning your placement.
        </p>
        {student.preferredHte && student.preferredHte !== match.company && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            Replaces your saved preference: <strong>{student.preferredHte}</strong>
          </p>
        )}
        {student.placementStatus === 'Approved & Deployed' && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Your current placement stays active unless your coordinator changes it.
          </p>
        )}
        {notice}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit Preference'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
