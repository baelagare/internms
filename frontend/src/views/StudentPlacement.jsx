import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  Notice,
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

export function StudentPlacement({ user = {}, db = {}, onChange }) {
  const student = db.users?.find(item => item.id === user.id && item.role === 'student') || (user.role === 'student' ? user : null);
  if (!student) {
    return (
      <EmptyState
        title="Student placement record unavailable"
        description="Your student record could not be found. Please sign in or contact your coordinator."
        icon="users"
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
        subtitle="Review host organization opportunities and manage your internship placement."
        badge={<StatusBadge status={student.placementStatus || 'Unplaced'} />}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              window.location.hash = '#/student/messages';
            }}
          >
            <Icon name="chat" size={16} />
            Message Coordinator
          </Button>
        }
      />

      {feedback && (
        <Notice tone="success" onDismiss={() => setFeedback('')}>
          <span>{feedback}</span>
        </Notice>
      )}

      {/* Current Placement Card */}
      <Card
        className={`p-6 space-y-4 ${
          deployed ? 'border-l-4 border-l-success' : 'border-l-4 border-l-accent'
        }`}
        aria-labelledby="current-placement-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              <span id="current-placement-heading">Current Assignment Status</span>
            </p>
            <h2 className="text-xl font-bold text-ink">
              {company || 'No host company assigned yet'}
            </h2>
            <p className="text-sm text-muted">
              {company
                ? student.assignedRole || assigned?.roleTitle || 'Intern'
                : pending
                ? 'Your placement preference has been recorded and is pending coordinator review.'
                : 'Review available partner opportunities below to submit a placement preference.'}
            </p>
          </div>
          <StatusBadge
            status={student.placementStatus || 'Unplaced'}
            tone={deployed ? 'success' : pending ? 'warning' : 'neutral'}
          />
        </div>

        {(company || student.preferredHte) && (
          <dl className="grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {company && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Work Location
                </dt>
                <dd className="mt-1 font-semibold text-ink">
                  {assigned?.location || 'Not recorded'}
                </dd>
              </div>
            )}
            {company && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Host Supervisor
                </dt>
                <dd className="mt-1 font-semibold text-ink">
                  {assigned?.supervisorName || 'Not recorded'}
                </dd>
              </div>
            )}
            {student.preferredHte && student.preferredHte !== company && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Submitted Preference
                </dt>
                <dd className="mt-1 font-semibold text-ink">
                  {student.preferredHte}
                  {student.preferredRole && (
                    <span className="block text-xs font-normal text-muted">
                      {student.preferredRole}
                    </span>
                  )}
                </dd>
              </div>
            )}
            {student.deploymentStartDate && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Deployment Start Date
                </dt>
                <dd className="mt-1 font-semibold text-ink">
                  {student.deploymentStartDate}
                </dd>
              </div>
            )}
          </dl>
        )}
      </Card>

      {/* Institutional Readiness Strip */}
      <Card className="p-6 space-y-4" aria-labelledby="placement-eligibility-heading">
        <SectionHeading
          id="placement-eligibility-heading"
          title="Placement Eligibility & Readiness"
          description="Institutional eligibility gates are verified by your college OJT coordinator."
          action={
            <Button
              variant="quiet"
              size="sm"
              onClick={() => {
                window.location.hash = '#/student/checklist';
              }}
            >
              <span>View Checklist</span>
              <Icon name="arrow" size={14} />
            </Button>
          }
        />
        <EligibilityList rows={eligibilityRows(student, null, db.collegeSettings)} overview />
      </Card>


      {/* Available Opportunities */}
      <section className="space-y-4" aria-labelledby="recommendations-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 id="recommendations-heading" className="text-lg font-semibold text-ink">
              {deployed ? 'Partner Host Organizations' : 'Available Opportunities'}
            </h2>
            <span className="ds-badge ds-tone--neutral">
              {result.matches.length} {result.matches.length === 1 ? 'opportunity' : 'opportunities'}
            </span>
          </div>

          <details className="text-xs text-muted">
            <summary className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 font-semibold text-accent hover:underline">
              <Icon name="help" size={15} />
              <span>How placement review works</span>
            </summary>
            <div className="mt-2 max-w-xl rounded-panel border border-line bg-surface p-4 leading-relaxed text-muted shadow-sm">
              Opportunity alignment reflects your recorded skills, degree coursework, and host college eligibility. Submitting a preference flags your interest for coordinator review; it does not guarantee a slot or finalize deployment.
            </div>
          </details>
        </div>

        {(missingSkills || missingCourses || !student.program) && (
          <Notice
            tone="warning"
            title="Profile information incomplete"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  window.location.hash = '#/student/profile';
                }}
              >
                Update Profile
              </Button>
            }
          >
            <span>
              {missingSkills && 'Add skills to improve matching. '}
              {missingCourses && 'Add completed coursework. '}
              {!student.program && 'Degree program is not recorded. '}
            </span>
          </Notice>
        )}

        {/* Filter & Sort Toolbar */}
        <Card className="p-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 max-w-xl">
              <Field
                label="Show"
                value={filter}
                onChange={event => setFilter(event.target.value)}
                options={[
                  { value: 'all', label: 'All organizations' },
                  { value: 'eligible', label: 'Eligible requirements only' },
                  { value: 'available', label: 'Open slots only' }
                ]}
              />
              <Field
                label="Sort by"
                value={sort}
                onChange={event => setSort(event.target.value)}
                options={[
                  { value: 'recommended', label: 'Recommended order' },
                  { value: 'highest', label: 'Highest alignment' },
                  { value: 'lowest', label: 'Lowest alignment' },
                  { value: 'name', label: 'Company name' }
                ]}
              />
            </div>
            <p role="status" className="text-xs font-semibold text-muted">
              Showing {visible.length} of {result.matches.length}
            </p>
          </div>
        </Card>


        {result.error ? (
          <Card className="p-6 space-y-3" role="alert">
            <h3 className="text-base font-semibold text-ink">Opportunities unavailable</h3>
            <p className="text-sm text-muted">{result.error}</p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </Card>
        ) : !result.matches.length ? (
          <EmptyState
            title={hosts.length ? 'No opportunity results' : 'No partner host organizations available'}
            description="Partner opportunities will appear here once registered by your OJT coordinator."
            icon="briefcase"
          />
        ) : !visible.length ? (
          <EmptyState
            title="No opportunities match this filter"
            description="Reset the filters to see all available partner companies."
            icon="search"
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Reset filters
              </Button>
            }
          />
        ) : (
          <ol className="space-y-4" aria-label="Available internship opportunities">
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
            setFeedback(`Placement preference for ${selected.company} submitted for coordinator review.`);
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
      title="Submit Placement Preference?"
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
          <h3 className="text-base font-semibold text-ink">{match.company}</h3>
          <p className="text-sm text-muted">{match.roleTitle}</p>
        </div>
        <p className="text-sm text-ink leading-relaxed">
          Your college coordinator will review this preference before assigning your official placement.
        </p>
        {student.preferredHte && student.preferredHte !== match.company && (
          <p className="rounded-panel border border-line bg-subtle p-3.5 text-xs text-muted">
            Replaces previously saved preference: <strong className="text-ink">{student.preferredHte}</strong>
          </p>
        )}
        {student.placementStatus === 'Approved & Deployed' && (
          <p className="rounded-panel border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            Your currently deployed placement remains active until changed by your coordinator.
          </p>
        )}
        {notice}
        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-line">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit Preference'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

