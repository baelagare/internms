import { useRef, useState } from 'react';
import { Button, Card, StatusBadge } from '../components/ui.jsx';
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

export function PortfolioList({ user, collection, items, onChange, onRemove }) {
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
    <Card className="p-5 space-y-4" aria-labelledby={`${collection}-heading`}>
      <ProfileHeading
        id={`${collection}-heading`}
        title={skill ? 'Skills' : 'Completed Coursework'}
        count={items.length}
      />

      {items.length ? (
        <ul
          className={
            skill
              ? 'profile-skill-list flex flex-wrap gap-2'
              : 'profile-course-list divide-y divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/50'
          }
        >
          {items.map((item, index) => (
            <li
              key={`${index}-${item}`}
              className={
                skill
                  ? 'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-1 py-1 text-sm font-semibold text-slate-800'
                  : 'flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-slate-800'
              }
            >
              <span>{item}</span>
              <Button
                type="button"
                variant="quiet"
                size="sm"
                aria-label={`Remove ${item}`}
                title={`Remove ${item}`}
                disabled={busy}
                onClick={() => onRemove(item, index)}
                className="!min-h-[36px] !px-2 text-slate-500 hover:text-red-700"
              >
                <Icon name="close" size={14} />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          {skill ? 'No skills added yet.' : 'No completed coursework recorded.'}
        </p>
      )}

      <form
        ref={form}
        className="flex flex-wrap items-end gap-2"
        noValidate
        onSubmit={submit}
        aria-busy={busy}
      >
        <div className="min-w-[200px] flex-1">
          <ProfileField
            label={skill ? 'Add skill' : 'Add course'}
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
    <Card className="p-5 space-y-4" aria-labelledby="resume-heading">
      <ProfileHeading id="resume-heading" title="Résumé / CV" />

      {resume ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Icon name="document" size={24} className="flex-none text-navy-800" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-slate-900">
                {resume.fileName || 'Unnamed document'}
              </h3>
              <p className="text-xs text-slate-600">
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
          <StatusBadge tone="success">Saved</StatusBadge>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          No résumé uploaded.
        </p>
      )}

      <div className="profile-upload space-y-3">
        <ProfileField
          label={resume ? 'Replace résumé' : 'Upload résumé'}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          disabled={busy}
          hint="PDF, PNG, or JPEG"
          error={error}
          onChange={select}
          inputRef={input}
          data-resume-file="true"
        />

        {file && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-navy-100 bg-navy-50 px-4 py-3 text-sm">
            <p className="font-semibold text-navy-950">
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

      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="secondary" onClick={onPreview}>
          <Icon name="file" size={16} />
          Preview generated résumé
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

export function Achievements({ user, items, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(emptyAchievement);
  const [tried, setTried] = useState(false);
  const { run, busy, notice } = useMutation(onChange);
  const form = useRef(null);
  const trigger = useRef(null);
  useUnsavedWarning(open && Object.values(value).some(text => text.length));

  const labels = {
    title: 'Title',
    issuer: 'Organization or event',
    description: 'Description'
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
    <Card className="p-5 space-y-4" aria-labelledby="achievements-heading">
      <ProfileHeading
        id="achievements-heading"
        title="Achievements & Projects"
        count={items.length}
      />

      {items.length ? (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {items.map((item, index) => (
            <li key={item.id || index} className="p-4">
              <article className="space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-500">
                      {[item.issuer, formatProfileDate(item.date)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <Button
                    variant="quiet"
                    size="sm"
                    aria-label={`Remove ${item.title}`}
                    title={`Remove ${item.title}`}
                    disabled={busy}
                    onClick={() => onRemove(item, index)}
                  >
                    <Icon name="close" size={16} />
                  </Button>
                </div>
                <p className="text-sm text-slate-700">{item.description}</p>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          No achievements or projects added yet.
        </p>
      )}

      {notice}

      <button
        ref={trigger}
        type="button"
        className="profile-add-toggle inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:border-navy-700 hover:bg-slate-50 hover:text-navy-900"
        aria-expanded={open}
        aria-controls="achievement-form"
        onClick={() => {
          if (!open) {
            setOpen(true);
            requestAnimationFrame(() => form.current?.querySelector('input')?.focus());
          }
        }}
      >
        + Add Achievement or Project
      </button>

      {open && (
        <form
          ref={form}
          id="achievement-form"
          className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
          noValidate
          onSubmit={submit}
          aria-busy={busy}
        >
          <h3 className="text-sm font-bold text-slate-900">New achievement or project</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField
              label={labels.title}
              name="title"
              required
              disabled={busy}
              error={tried && errors.title}
              value={value.title}
              onChange={event => setValue(previous => ({ ...previous, title: event.target.value }))}
            />
            <ProfileField
              label={labels.issuer}
              name="issuer"
              required
              disabled={busy}
              error={tried && errors.issuer}
              value={value.issuer}
              onChange={event =>
                setValue(previous => ({ ...previous, issuer: event.target.value }))
              }
            />
          </div>
          <ProfileField
            label={labels.description}
            name="description"
            multiline
            required
            disabled={busy}
            error={tried && errors.description}
            value={value.description}
            onChange={event =>
              setValue(previous => ({ ...previous, description: event.target.value }))
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save achievement or project'}
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
