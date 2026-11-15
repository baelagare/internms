import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, Notice, StatusBadge } from '../components/ui.jsx';
import { DataTable, Field, Modal, WorkspacePage, useMutation } from '../components/workflow.jsx';
import { rubric, scoreEvaluation } from '../services/evaluations.js';
import { scopedStudents } from '../services/records.js';
import { saveEvaluation } from '../services/applicationService.js';
import './evaluations.css';

export function EvaluationDetails({ evaluation = {} }) {
  const scores = evaluation.scores || {};
  return (
    <div className="evaluation-details-print space-y-5">
      <div className="border-b border-line pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-ink">Performance Evaluation</h3>
            <p className="text-sm font-semibold text-accent">{evaluation.studentName || 'Student Intern'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-ink">{evaluation.company || 'Host Company'}</p>
            <p className="text-xs text-muted">Supervisor: {evaluation.supervisorName || 'Not recorded'}</p>
            {evaluation.evaluationPeriod && <p className="text-xs text-muted">Period: {evaluation.evaluationPeriod}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-panel border border-line bg-subtle p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <span className="text-xs text-muted">Total Score</span>
            <p className="text-2xl font-bold tabular-nums text-ink">{evaluation.totalScore != null ? `${evaluation.totalScore} / ${evaluation.maxScore || 95}` : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-muted">Average Rating</span>
            <p className="text-2xl font-bold tabular-nums text-ink">{evaluation.averageRating != null ? `${evaluation.averageRating} / 5.0` : '—'}</p>
          </div>
          <div>
            <span className="text-xs text-muted">Equivalent Rating</span>
            <p className="text-sm font-semibold text-ink">{evaluation.equivalentRating || '—'}</p>
          </div>
        </div>
        {evaluation.recommendation && (
          <p className="mt-3 border-t border-line pt-3 text-xs text-ink">
            <strong>Recommendation:</strong> <span className="text-muted">{evaluation.recommendation}</span>
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Criteria Ratings (19 Items)</h4>
        {rubric.map(([title, items], group) => (
          <section key={title} className="rounded-panel border border-line bg-surface p-4 space-y-2">
            <h5 className="font-semibold text-sm text-ink">{title}</h5>
            <ol className="divide-y divide-line text-sm" start={group * 5 + 1}>
              {items.map((label, index) => {
                const qNum = group * 5 + index + 1;
                const scoreVal = scores[`q${qNum}`];
                return (
                  <li key={label} className="flex items-center justify-between gap-3 py-2 text-xs">
                    <span className="text-muted"><strong className="text-ink font-semibold">{qNum}.</strong> {label}</span>
                    <span className="font-bold tabular-nums text-ink shrink-0">{scoreVal != null ? `${scoreVal} / 5` : '—'}</span>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-panel border border-line bg-surface p-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-muted">Observed Strengths</h5>
          <p className="mt-1 text-sm text-ink whitespace-pre-wrap">{evaluation.strengths || 'None recorded.'}</p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-muted">Areas for Improvement</h5>
          <p className="mt-1 text-sm text-ink whitespace-pre-wrap">{evaluation.areasForImprovement || 'None recorded.'}</p>
        </div>
      </div>

      {(evaluation.coordinatorClearanceStatus || evaluation.coordinatorClearedBy) && (
        <div className="border-t border-line pt-3 text-xs text-muted">
          <span>Coordinator Clearance: <strong className="text-ink">{evaluation.coordinatorClearanceStatus || 'Pending'}</strong></span>
          {evaluation.coordinatorClearedBy && <span> · Certified by: <strong className="text-ink">{evaluation.coordinatorClearedBy}</strong></span>}
        </div>
      )}
    </div>
  );
}
export function Evaluations({ user, db, onChange }) {
  const students = scopedStudents(db, user);
  const [selected, setSelected] = useState(students[0]?.id || '');
  const [preview, setPreview] = useState(null);
  const student = students.find(item => item.id === selected);
  const existing = db.evaluations.find(item => item.studentId === selected && item.company === user.company);
  return (
    <WorkspacePage
      title="Performance evaluations"
      subtitle={user.company ? `Conduct and review performance evaluations for interns assigned to ${user.company}.` : 'Conduct and review performance evaluations.'}
    >
      {!students.length ? (
        <EmptyState
          title="No assigned interns"
          description="Performance evaluations will become available once student interns are assigned to your company."
          icon="users"
        />
      ) : (
        <div className="evaluations-page">
          <Field
            label="Select intern to evaluate"
            options={students.map(item => ({
              value: item.id,
              label: `${item.name || 'Student'} · ${item.program || item.college || 'Intern'}`
            }))}
            value={selected}
            onChange={event => setSelected(event.target.value)}
          />
          {student && (
            <EvaluationForm
              key={selected}
              user={user}
              student={student}
              existing={existing}
              onChange={onChange}
            />
          )}
          <DataTable
            title="Recorded evaluations"
            rows={db.evaluations.filter(
              item => students.some(s => s.id === item.studentId) && item.company === user.company
            )}
            emptyTitle="No evaluations submitted"
            emptyDescription="Submitted evaluations will appear in this table."
            columns={[
              { key: 'studentName', label: 'Intern' },
              { key: 'evaluationPeriod', label: 'Period' },
              { key: 'totalScore', label: 'Score', render: item => item.totalScore != null ? `${item.totalScore}/95` : '—' },
              { key: 'averageRating', label: 'Average', render: item => item.averageRating != null ? `${item.averageRating}/5` : '—' },
              { key: 'submittedAt', label: 'Submitted', render: item => item.submittedAt || '—' },
              { key: 'coordinatorClearanceStatus', label: 'Clearance', render: item => item.coordinatorClearanceStatus ? <StatusBadge status={item.coordinatorClearanceStatus} /> : 'Pending' },
              { key: 'actions', label: 'Actions', render: item => <Button variant="secondary" onClick={() => setPreview(item)}>Preview</Button> }
            ]}
          />
        </div>
      )}
      {preview && (
        <Modal title={`Evaluation preview · ${preview.studentName || 'Intern'}`} onClose={() => setPreview(null)}>
          <EvaluationDetails evaluation={preview} />
          <div className="flex justify-end pt-3 border-t border-line">
            <Button variant="secondary" onClick={() => window.print()}>Print evaluation</Button>
          </div>
        </Modal>
      )}
    </WorkspacePage>
  );
}

function EvaluationForm({ user, student, existing, onChange }) {
  const [values, setValues] = useState({
    evaluationPeriod: existing?.evaluationPeriod || '',
    strengths: existing?.strengths || '',
    areasForImprovement: existing?.areasForImprovement || '',
    scores: existing?.scores || {}
  });
  const { run, busy, notice } = useMutation(onChange);
  const ratedCount = Array.from({ length: 19 }, (_, i) => values.scores[`q${i + 1}`]).filter(v => Number.isInteger(v) && v >= 1 && v <= 5).length;
  const isComplete = ratedCount === 19;
  let score = { totalScore: '—', averageRating: '—', equivalentRating: 'Complete every rating' };
  try { score = scoreEvaluation(values.scores); } catch { /* An incomplete evaluation has no score. */ }

  const ratingOptions = [
    { value: '', label: 'Select rating (1 to 5)' },
    { value: 5, label: '5 — Outstanding (Exceptional performance)' },
    { value: 4, label: '4 — Very Satisfactory (Above average)' },
    { value: 3, label: '3 — Satisfactory (Meets standard expectations)' },
    { value: 2, label: '2 — Fair (Below expectations, needs guidance)' },
    { value: 1, label: '1 — Needs Improvement (Unsatisfactory)' }
  ];

  return (
    <Card className="space-y-6 p-6">
      <div>
        <h3 className="text-lg font-semibold text-ink">
          {existing ? `Update Evaluation · ${student.name || 'Intern'}` : `New Performance Evaluation · ${student.name || 'Intern'}`}
        </h3>
        <p className="text-xs text-muted">
          Rate all 19 criteria based on the university rubric. Evaluation scores are factored into final academic clearance.
        </p>
      </div>

      {notice}

      <form
        className="space-y-6"
        onSubmit={event => {
          event.preventDefault();
          run(
            () => saveEvaluation(user, student.id, values),
            'Evaluation submitted and pending coordinator clearance.'
          );
        }}
      >
        <Field
          label="Evaluation period"
          required
          placeholder="e.g. Midterm Evaluation 2026, Final OJT Period"
          value={values.evaluationPeriod}
          onChange={event => setValues(previous => ({ ...previous, evaluationPeriod: event.target.value }))}
          hint="Specify the academic term or training milestone being evaluated."
        />

        {/* Live score indicator */}
        <div className={`evaluation-score-card ${isComplete ? 'evaluation-score-card--complete' : ''}`} role="status">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-muted">Criteria Completed</span>
              <p className="text-sm font-bold text-ink">{ratedCount} of 19 criteria rated</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-muted">Total Score</span>
              <p className="text-xl font-bold tabular-nums text-ink">{score.totalScore}/95</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-muted">Rating Equivalent</span>
              <p className="text-sm font-semibold text-ink">{score.equivalentRating}</p>
            </div>
          </div>
          {score.recommendation && (
            <p className="mt-3 border-t border-line pt-2 text-xs text-ink">
              <strong>Outcome:</strong> <span className="text-muted">{score.recommendation}</span>
            </p>
          )}
        </div>

        {/* 4 Rubric Sections */}
        {rubric.map(([title, items], group) => (
          <fieldset key={title} className="evaluation-rubric-fieldset space-y-4">
            <legend className="evaluation-rubric-legend">{group + 1}. {title}</legend>
            <div className="evaluation-criteria-list">
              {items.map((label, index) => {
                const qNum = group * 5 + index + 1;
                const key = `q${qNum}`;
                return (
                  <Field
                    key={key}
                    label={`${qNum}. ${label}`}
                    options={ratingOptions}
                    required
                    value={values.scores[key] ?? ''}
                    onChange={event => {
                      const raw = event.target.value;
                      setValues(previous => ({
                        ...previous,
                        scores: {
                          ...previous.scores,
                          [key]: raw === '' ? '' : Number(raw)
                        }
                      }));
                    }}
                  />
                );
              })}
            </div>
          </fieldset>
        ))}

        {/* Qualitative Feedback */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Observed strengths & achievements"
            multiline
            required
            placeholder="Detail the intern's notable strengths, professional contributions, and skills demonstrated."
            value={values.strengths}
            onChange={event => setValues(previous => ({ ...previous, strengths: event.target.value }))}
          />
          <Field
            label="Areas for professional improvement"
            multiline
            required
            placeholder="Identify specific competencies, habits, or technical areas the intern should develop."
            value={values.areasForImprovement}
            onChange={event => setValues(previous => ({ ...previous, areasForImprovement: event.target.value }))}
          />
        </div>

        <div className="pt-2">
          <Notice tone="info" title="Backend connection required">
            Submitting evaluations requires the Phase 4 Laravel backend. Completed evaluations are certified by the college coordinator for graduation clearance.
          </Notice>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={busy || !isComplete || !values.evaluationPeriod.trim()}
            loading={busy}
            loadingLabel="Submitting evaluation…"
          >
            {existing ? 'Update performance evaluation' : 'Submit performance evaluation'}
          </Button>
        </div>
      </form>
    </Card>
  );
}