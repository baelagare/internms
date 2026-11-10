import { useRef, useState } from 'react';
import { Button, Card, HelpTip, PageHeader, StatusBadge } from '../components/ui.jsx';
import { Icon } from '../components/Icons.jsx';
import { Modal, useMutation } from '../components/workflow.jsx';
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
        badge={
          user.studentNumber ? <StatusBadge tone="blue">{user.studentNumber}</StatusBadge> : null
        }
        action={
          <Button variant="secondary" onClick={() => setPreview(true)}>
            <Icon name="file" size={16} />
            Preview résumé
          </Button>
        }
      />

      {!remove && notice}

      {undo && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p>
            Removed: <strong>{removalLabel(undo)}</strong>
          </p>
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
        </div>
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
        <Modal title="Résumé preview" onClose={() => setPreview(false)}>
          <div className="space-y-4">
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Built from your saved profile, not the attached document. Save any changes first to
              include them here.
            </p>
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-extrabold text-navy-950">{user.name}</h3>
              <p className="text-sm text-slate-600">
                {[user.program, user.college, user.gpa != null ? `GPA ${user.gpa}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {[portfolio.email, portfolio.phone, portfolio.portfolioUrl]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Career summary
              </h4>
              <p className="mt-1 text-sm text-slate-800">
                {portfolio.bio || 'No career summary added.'}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Skills</h4>
              <p className="mt-1 text-sm text-slate-800">
                {(portfolio.skills || []).join(' • ') || 'No skills added yet.'}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Completed coursework
              </h4>
              <p className="mt-1 text-sm text-slate-800">
                {(portfolio.coursework || []).join(' • ') || 'No completed coursework recorded.'}
              </p>
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
          <p className="break-words text-sm text-slate-700">
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
    <Card className="p-5" aria-labelledby="profile-information-heading">
      <ProfileHeading
        id="profile-information-heading"
        title="Academic & contact details"
        action={
          <HelpTip label="About these fields">
            Your GPA, skills, and courses help match you with host companies. Disciplinary clearance
            is set by your coordinator.
          </HelpTip>
        }
      />

      <form ref={formRef} onSubmit={submit} noValidate aria-busy={busy} className="space-y-6">
        <fieldset disabled={busy} className="space-y-3 border-0 p-0">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Academic record
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <ProfileField
              label="GPA"
              type="number"
              min="1"
              max="5"
              step="0.01"
              required
              hint="1.00 highest · 5.00 lowest"
              {...field('gpa')}
            />
            <ProfileField
              label="Academic standing"
              options={['', ...academicStandings]}
              required
              {...field('academicStanding')}
            />
            <ProfileField
              label="Disciplinary clearance"
              value={user.disciplinaryClearance || 'Not recorded'}
              readOnly
              hint="Set by your coordinator"
            />
          </div>
        </fieldset>

        <fieldset disabled={busy} className="space-y-3 border-0 border-t border-slate-200 pt-5 p-0">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Contact & links
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <ProfileField
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.edu"
              required
              {...field('email')}
            />
            <ProfileField
              label="Mobile number"
              type="tel"
              autoComplete="tel"
              placeholder="+63 917 123 4567"
              required
              {...field('phone')}
            />
            <ProfileField
              label="Portfolio or GitHub link"
              type="url"
              autoComplete="url"
              placeholder="https://github.com/username"
              hint="Optional"
              {...field('portfolioUrl')}
            />
          </div>
        </fieldset>

        <fieldset disabled={busy} className="space-y-3 border-0 border-t border-slate-200 pt-5 p-0">
          <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">
            About you
          </legend>
          <ProfileField
            label="Career summary"
            multiline
            required
            hint="Briefly describe your strengths and what kind of OJT work you want."
            {...field('bio')}
          />
        </fieldset>

        {notice}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <p aria-live="polite" className="text-xs font-semibold text-slate-600">
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </p>
          <Button type="submit" disabled={busy || !dirty}>
            <Icon name="check" size={16} />
            {busy ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
