import { useRef, useState } from 'react';
import { Button, Card, HelpTip, Notice, PageHeader, StatusBadge } from '../components/ui.jsx';
import { Icon } from '../components/Icons.jsx';
import { Modal, useMutation } from '../components/workflow.jsx';
import { StudentOnboardingModal } from '../components/StudentOnboardingModal.jsx';
import {
  editPortfolio,
  removeResume,
  restorePortfolioItem,
  saveProfile
} from '../services/applicationService.js';
import { academicStandings, profileValues, validateProfile } from '../services/studentProfile.js';
import {
  ProfileField,
  ProfileHeading,
  focusInvalid,
  useUnsavedWarning
} from './profileControls.jsx';
import { PortfolioList, ResumeCard, Achievements } from './StudentProfileSections.jsx';

export function StudentProfile({ user, onChange }) {
  const portfolio = user.portfolioData || {};
  const [preview, setPreview] = useState(false);
  const [remove, setRemove] = useState(null);
  const [undo, setUndo] = useState(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const commit = next => {
    setUndo(null);
    onChange(next);
  };
  const { run, busy, notice } = useMutation(commit);
  const removalLabel = item =>
    typeof item.value === 'string' ? item.value : item.value?.title || item.value?.fileName;

  async function confirmRemoval() {
    const item = remove;
    if (
      await run(
        () =>
          item.collection === 'resume'
            ? removeResume(user)
            : editPortfolio(user, item.collection, 'remove', item.index),
        'Removed. You can undo this below.'
      )
    ) {
      setUndo(item);
      setRemove(null);
    }
  }

  return (
    <div className="student-profile space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Manage your academic record, contact links, skills, and résumé."
        badge={
          user.studentNumber ? <StatusBadge tone="neutral">{user.studentNumber}</StatusBadge> : null
        }
        action={
          <Button variant="secondary" onClick={() => setPreview(true)}>
            <Icon name="file" size={16} />
            Preview Résumé
          </Button>
        }
      />

      {/* Official Institutional Record Banner (Read-only) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-line bg-subtle p-4">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-muted">Official University Identity</p>
          <h2 className="text-base font-semibold text-ink">{user.name || 'Student Intern'}</h2>
          <p className="text-xs text-muted">
            {[user.studentNumber && `ID: ${user.studentNumber}`, user.program, user.college].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Disciplinary Clearance:</span>
          <StatusBadge
            status={user.disciplinaryClearance || 'Pending'}
            tone={user.disciplinaryClearance === 'Cleared' ? 'success' : 'neutral'}
          />
        </div>
      </div>

      {(!user.college || user.enrollmentStatus === 'PENDING_ONBOARDING') && (
        <Notice
          tone="warning"
          title="Academic Onboarding Required"
          action={
            <Button variant="primary" size="sm" onClick={() => setOnboardingOpen(true)}>
              Complete Declaration
            </Button>
          }
        >
          Your student account is not yet enrolled in an official college. Select your college and degree program to connect with your College OJT Coordinator.
        </Notice>
      )}

      {user.enrollmentStatus === 'PENDING_APPROVAL' && (
        <Notice
          tone="info"
          title="Enrollment Pending Coordinator Approval"
          action={
            <Button variant="secondary" size="sm" onClick={() => setOnboardingOpen(true)}>
              Edit Declaration
            </Button>
          }
        >
          Your declaration for <strong>{user.college} · {user.program}</strong> (ID: {user.studentNumber}) is under review by your College OJT Coordinator.
        </Notice>
      )}

      {user.enrollmentStatus === 'REJECTED' && (
        <Notice
          tone="danger"
          title="Enrollment Revision Requested"
          action={
            <Button variant="danger" size="sm" onClick={() => setOnboardingOpen(true)}>
              Resubmit Declaration
            </Button>
          }
        >
          {user.rejectionReason || 'Your coordinator requested corrections to your college or student identification number.'}
        </Notice>
      )}

      {!remove && notice}

      {undo && (
        <Notice
          tone="warning"
          title={`Removed: ${removalLabel(undo)}`}
          action={
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={async () => {
                if (
                  await run(
                    () => restorePortfolioItem(user, undo.collection, undo.value, undo.index),
                    'Restored.'
                  )
                ) {
                  setUndo(null);
                }
              }}
            >
              Undo removal
            </Button>
          }
        >
          <span>You can restore this item to your profile.</span>
        </Notice>
      )}

      <AcademicProfile user={user} onChange={commit} />


      <div className="grid gap-6 lg:grid-cols-2">
        {['skills', 'coursework'].map(collection => (
          <PortfolioList
            key={collection}
            user={user}
            collection={collection}
            items={portfolio[collection] || []}
            onChange={commit}
            onRemove={(value, index) => setRemove({ collection, value, index })}
          />
        ))}
      </div>

      <ResumeCard
        user={user}
        onChange={commit}
        onPreview={() => setPreview(true)}
        onRemove={() => setRemove({ collection: 'resume', value: portfolio.resume })}
      />

      <Achievements
        user={user}
        items={portfolio.achievements || []}
        onChange={commit}
        onRemove={(value, index) => setRemove({ collection: 'achievements', value, index })}
      />

      {preview && (
        <Modal title="Structured Résumé Preview" onClose={() => setPreview(false)}>
          <div className="space-y-4 print-report">
            <p className="rounded-control border border-line bg-subtle px-3.5 py-2.5 text-xs text-muted no-print">
              Generated dynamically from your saved profile fields. Ensure unsaved changes are saved before printing.
            </p>
            <div className="border-b border-line pb-3">
              <h3 className="text-xl font-bold text-ink">{user.name}</h3>
              <p className="text-sm font-semibold text-accent">
                {[user.program, user.college, user.gpa != null ? `GPA: ${user.gpa}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="mt-1 text-xs text-muted">
                {[portfolio.email, portfolio.phone, portfolio.portfolioUrl]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Career Goals & Summary
              </h4>
              <p className="mt-1 text-sm text-ink leading-relaxed">
                {portfolio.bio || 'No career summary added.'}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Skills</h4>
              <p className="mt-1 text-sm text-ink leading-relaxed">
                {(portfolio.skills || []).join(' • ') || 'No skills added yet.'}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Completed Coursework
              </h4>
              <p className="mt-1 text-sm text-ink leading-relaxed">
                {(portfolio.coursework || []).join(' • ') || 'No completed coursework recorded.'}
              </p>
            </div>
            <div className="pt-2 no-print">
              <Button variant="secondary" onClick={() => window.print()}>
                <Icon name="printer" size={16} />
                Print Résumé
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {remove && (
        <Modal
          title={remove.collection === 'resume' ? 'Remove résumé?' : 'Remove item?'}
          onClose={() => {
            if (!busy) setRemove(null);
          }}
        >
          <p className="break-words text-sm text-ink">
            Remove <strong>{removalLabel(remove)}</strong> from your profile?
          </p>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="secondary" disabled={busy} onClick={() => setRemove(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={busy} onClick={confirmRemoval}>
              {busy ? 'Removing…' : 'Confirm removal'}
            </Button>
          </div>
          {notice}
        </Modal>
      )}

      {onboardingOpen && (
        <StudentOnboardingModal
          user={user}
          onClose={() => setOnboardingOpen(false)}
          onChange={commit}
        />
      )}

    </div>
  );
}

function AcademicProfile({ user, onChange }) {
  const [values, setValues] = useState(() => profileValues(user));
  const [saved, setSaved] = useState(() => profileValues(user));
  const [tried, setTried] = useState(false);
  const { run, busy, notice } = useMutation(onChange);
  const formRef = useRef(null);
  const errors = validateProfile(values);
  const dirty = Object.keys(values).some(key => values[key] !== saved[key]);
  useUnsavedWarning(dirty);

  const field = key => ({
    name: key,
    value: values[key],
    error: tried && errors[key],
    onChange: event => setValues(previous => ({ ...previous, [key]: event.target.value }))
  });

  async function submit(event) {
    event.preventDefault();
    setTried(true);
    if (Object.keys(errors).length) {
      focusInvalid(formRef.current);
      return;
    }
    const snapshot = { ...values };
    if (await run(() => saveProfile(user, snapshot), 'Profile saved.')) {
      setSaved(snapshot);
      setTried(false);
    }
  }

  return (
    <Card className="p-6 space-y-6" aria-labelledby="profile-information-heading">
      <ProfileHeading
        id="profile-information-heading"
        title="Academic & Contact Details"
        description="Your GPA, standing, and summary are used for internship matching. Disciplinary status is managed by your coordinator."
        action={
          <HelpTip label="About these records">
            Student-managed fields can be edited and saved here. Clearance and institutional records are read-only.
          </HelpTip>
        }
      />

      <form ref={formRef} onSubmit={submit} noValidate aria-busy={busy} className="space-y-6">
        <fieldset disabled={busy} className="space-y-4 border-0 p-0">
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted">
            Academic performance
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <ProfileField
              label="Grade Point Average (GPA)"
              type="number"
              min="1.00"
              max="5.00"
              step="0.01"
              required
              hint="Philippine scale: 1.00 highest · 3.00 passing"
              {...field('gpa')}
            />
            <ProfileField
              label="Academic standing"
              options={['', ...academicStandings]}
              required
              hint="Current academic classification"
              {...field('academicStanding')}
            />
            <ProfileField
              label="Disciplinary clearance (Read-only)"
              value={user.disciplinaryClearance || 'Not recorded'}
              readOnly
              hint="Official record managed by coordinator"
            />
          </div>
        </fieldset>


        <fieldset disabled={busy} className="space-y-4 border-0 border-t border-line pt-5 p-0">
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted">
            Contact information & links
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <ProfileField
              label="Institutional email"
              type="email"
              autoComplete="email"
              placeholder="student@nemsu.edu.ph"
              required
              hint="Official university email address"
              {...field('email')}
            />
            <ProfileField
              label="Mobile contact number"
              type="tel"
              autoComplete="tel"
              placeholder="+63 900 000 0000"
              required
              hint="For coordinator and host contact"
              {...field('phone')}
            />
            <ProfileField
              label="Portfolio or project link"
              type="url"
              autoComplete="url"
              placeholder="https://github.com/..."
              hint="Optional HTTP or HTTPS URL"
              {...field('portfolioUrl')}
            />
          </div>
        </fieldset>

        <fieldset disabled={busy} className="space-y-4 border-0 border-t border-line pt-5 p-0">
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted">
            Professional summary
          </legend>
          <ProfileField
            label="Career goals & strengths"
            multiline
            rows={4}
            required
            hint="Summarize your technical interests, strengths, and desired OJT role."
            {...field('bio')}
          />
        </fieldset>

        {notice}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p aria-live="polite" className="text-xs font-semibold text-muted">
            {dirty ? 'Unsaved changes in form' : 'All profile fields saved'}
          </p>
          <Button type="submit" variant="primary" disabled={busy || !dirty}>
            <Icon name="check" size={16} />
            {busy ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

