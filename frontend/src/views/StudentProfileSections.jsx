import { useRef, useState } from 'react';
import { Button, Card, EmptyState, IconButton, StatusBadge } from '../components/ui.jsx';
import { Icon } from '../components/Icons.jsx';
import { useMutation } from '../components/workflow.jsx';
import { editPortfolio, saveStudentFile } from '../services/applicationService.js';
import { formatProfileDate, validatePortfolioEntry } from '../services/studentProfile.js';
import {
  ProfileField,
  ProfileHeading,
  focusInvalid,
  useUnsavedWarning
} from './profileControls.jsx';

export function PortfolioList({ user, collection, items = [], onChange, onRemove }) {
  const [value, setValue] = useState('');
  const [tried, setTried] = useState(false);
  const { run, busy, notice } = useMutation(onChange);
  const form = useRef(null);
  const skill = collection === 'skills';
  const error = validatePortfolioEntry(items, value);

  async function submit(event) {
    event.preventDefault();
    setTried(true);
    if (error) {
      focusInvalid(form.current);
      return;
    }
    if (
      await run(
        () => editPortfolio(user, collection, 'add', value),
        `${skill ? 'Skill' : 'Course'} added.`
      )
    ) {
      setValue('');
      setTried(false);
    }
  }

  return (
    <Card className="p-6 space-y-4" aria-labelledby={`${collection}-heading`}>
      <ProfileHeading
        id={`${collection}-heading`}
        title={skill ? 'Skills & Competencies' : 'Completed Coursework'}
        count={items.length}
        description={skill ? 'Add technical and operational skills for placement matching.' : 'Record key degree courses completed.'}
      />


      {items.length ? (
        <ul
          className={
            skill
              ? 'flex flex-wrap gap-2'
              : 'divide-y divide-line rounded-panel border border-line bg-subtle'
          }
        >
          {items.map((item, index) => (
            <li
              key={`${index}-${item}`}
              className={
                skill
                  ? 'inline-flex items-center gap-2 rounded-control border border-line bg-surface pl-3 pr-1 py-1 text-sm font-semibold text-ink shadow-sm'
                  : 'flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-ink'
              }
            >
              <span>{item}</span>
              <IconButton
                label={`Remove ${item}`}
                icon="close"
                variant="quiet"
                disabled={busy}
                onClick={() => onRemove(item, index)}
                className="!min-h-[36px] !min-w-[36px] text-muted hover:text-danger"
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={skill ? 'No skills added yet' : 'No completed coursework recorded'}
          description={skill ? 'Add skills you bring to an internship.' : 'Add relevant academic courses you have finished.'}
          icon={skill ? 'award' : 'document'}
        />
      )}

      <form
        ref={form}
        className="flex flex-wrap items-end gap-2 pt-2 border-t border-line"
        noValidate
        onSubmit={submit}
        aria-busy={busy}
      >
        <div className="min-w-[220px] flex-1">
          <ProfileField
            label={skill ? 'Add skill' : 'Add coursework'}
            name={collection}
            placeholder={
              skill ? 'e.g. Technical documentation' : 'e.g. CS 312: Software Engineering II'
            }
            required
            value={value}
            disabled={busy}
            error={tried && error}
            onChange={event => setValue(event.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={busy}>
          <Icon name="plus" size={16} />
          {busy ? 'Adding…' : 'Add'}
        </Button>
      </form>
      {notice}
    </Card>
  );
}

export function ResumeCard({ user, onChange, onPreview, onRemove }) {
  const resume = user.portfolioData?.resume;
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const input = useRef(null);
  const { run, busy, notice } = useMutation(onChange);
  const extension = resume?.fileName?.match(/\.([a-z0-9]+)$/i)?.[1].toUpperCase();

  function select(event) {
    const next = event.target.files?.[0];
    if (!next) return;
    setFile(null);
    if (!/\.(pdf|png|jpe?g)$/i.test(next.name)) {
      setError('Choose a PDF, PNG, or JPEG document.');
      return;
    }
    setError('');
    setFile(next);
  }

  async function save() {
    if (await run(() => saveStudentFile(user, 'resume', file), 'Résumé saved.')) {
      setFile(null);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <Card className="p-6 space-y-4" aria-labelledby="resume-heading">
      <ProfileHeading
        id="resume-heading"
        title="Résumé / CV Document"
        description="Manage your uploaded document metadata or preview a structured résumé built from your profile."
      />

      {resume ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-subtle p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Icon name="document" size={24} className="flex-none text-accent" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-ink">
                {resume.fileName || 'Document record'}
              </h3>
              <p className="text-xs text-muted">
                {[
                  extension,
                  resume.fileSize,
                  resume.uploadedAt && `Uploaded ${formatProfileDate(resume.uploadedAt)}`
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
          <StatusBadge tone="success">Uploaded</StatusBadge>
        </div>
      ) : (
        <EmptyState
          title="No résumé document uploaded"
          description="Select a PDF or image file to record your résumé submission."
          icon="document"
        />
      )}

      <div className="space-y-3 pt-2 border-t border-line">
        <ProfileField
          label={resume ? 'Replace document' : 'Upload document'}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          disabled={busy}
          hint="Accepted formats: PDF, PNG, or JPEG"
          error={error}
          onChange={select}
          inputRef={input}
          data-resume-file="true"
        />

        {file && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-subtle px-4 py-3 text-sm">
            <p className="font-semibold text-ink">
              Selected: <strong>{file.name}</strong> · {Math.max(1, Math.round(file.size / 1024))} KB
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={save}>
                {busy ? 'Saving…' : 'Save résumé metadata'}
              </Button>
              <Button
                variant="quiet"
                disabled={busy}
                onClick={() => {
                  setFile(null);
                  if (input.current) input.current.value = '';
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {notice}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button variant="secondary" onClick={onPreview}>
          <Icon name="file" size={16} />
          Preview Structured Résumé
        </Button>
        {resume && (
          <Button variant="danger" disabled={busy} onClick={onRemove}>
            Remove résumé
          </Button>
        )}
      </div>
    </Card>
  );
}

const emptyAchievement = { title: '', issuer: '', description: '' };

export function Achievements({ user, items = [], onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(emptyAchievement);
  const [tried, setTried] = useState(false);
  const { run, busy, notice } = useMutation(onChange);
  const form = useRef(null);
  const trigger = useRef(null);
  useUnsavedWarning(open && Object.values(value).some(text => text.length));

  const labels = {
    title: 'Achievement or project title',
    issuer: 'Issuing organization or event',
    description: 'Summary of contribution or award'
  };
  const errors = Object.fromEntries(
    Object.entries(labels)
      .filter(([key]) => !value[key].trim())
      .map(([key, label]) => [key, `Enter ${label.toLowerCase()}.`])
  );

  function close() {
    setOpen(false);
    setValue(emptyAchievement);
    setTried(false);
    trigger.current?.focus();
  }

  async function submit(event) {
    event.preventDefault();
    setTried(true);
    if (Object.keys(errors).length) {
      focusInvalid(form.current);
      return;
    }
    if (await run(() => editPortfolio(user, 'achievements', 'add', value), 'Added to your profile.')) {
      close();
    }
  }

  return (
    <Card className="p-6 space-y-4" aria-labelledby="achievements-heading">
      <ProfileHeading
        id="achievements-heading"
        title="Achievements & Projects"
        count={items.length}
        description="Certifications, competitions, software projects, or extracurricular achievements."
      />

      {items.length ? (
        <ul className="divide-y divide-line rounded-panel border border-line">
          {items.map((item, index) => (
            <li key={item.id || index} className="p-4 hover:bg-subtle transition-colors">
              <article className="space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                    <p className="text-xs text-muted">
                      {[item.issuer, formatProfileDate(item.date)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <IconButton
                    label={`Remove ${item.title}`}
                    icon="close"
                    variant="quiet"
                    disabled={busy}
                    onClick={() => onRemove(item, index)}
                    className="text-muted hover:text-danger"
                  />
                </div>
                <p className="text-sm text-ink leading-relaxed">{item.description}</p>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No achievements or projects added yet"
          description="Record awards, extracurricular milestones, or academic projects."
          icon="award"
        />
      )}

      {notice}

      {!open ? (
        <Button
          ref={trigger}
          variant="secondary"
          onClick={() => {
            setOpen(true);
            requestAnimationFrame(() => form.current?.querySelector('input')?.focus());
          }}
          className="w-full sm:w-auto"
        >
          <Icon name="plus" size={16} />
          Add Achievement or Project
        </Button>
      ) : (
        <form
          ref={form}
          id="achievement-form"
          className="space-y-4 rounded-panel border border-line bg-subtle p-5"
          noValidate
          onSubmit={submit}
          aria-busy={busy}
        >
          <h3 className="text-sm font-semibold text-ink">New Achievement or Project</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField
              label={labels.title}
              name="title"
              required
              disabled={busy}
              error={tried && errors.title}
              value={value.title}
              onChange={event => setValue(prev => ({ ...prev, title: event.target.value }))}
            />
            <ProfileField
              label={labels.issuer}
              name="issuer"
              required
              disabled={busy}
              error={tried && errors.issuer}
              value={value.issuer}
              onChange={event => setValue(prev => ({ ...prev, issuer: event.target.value }))}
            />
          </div>
          <ProfileField
            label={labels.description}
            name="description"
            multiline
            rows={3}
            required
            disabled={busy}
            error={tried && errors.description}
            value={value.description}
            onChange={event => setValue(prev => ({ ...prev, description: event.target.value }))}
          />
          <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save Achievement'}
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
