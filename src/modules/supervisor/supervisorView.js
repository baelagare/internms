import {
  getState,
  persistDatabase,
  getSupervisorScopedInterns,
  getScopedLogs,
  getScopedDisputes,
  getScopedHtes,
  getCollegeQuotaHours,
  recordAuditLog
} from '../../state/store.js';
import { showToast } from '../../components/ui/ToastManager.js';
import { openConfirmModal } from '../../components/ui/ConfirmModal.js';
import { renderStatusBadge } from '../../components/ui/Badge.js';
import { renderEmptyState } from '../../components/ui/EmptyState.js';
import { renderMessagesWorkspace } from '../messaging/chatView.js';
import { openEvaluationPreviewDialog } from '../student/studentView.js';
import { icon } from '../../components/ui/Icons.js';
import { esc } from '../../utils/html.js';

const RUBRIC_SECTIONS = [
  {
    sectionTitle: 'I. Technical Competence & Quality of Work (25 Points)',
    items: [
      { id: 'q1', label: '1. Mastery of fundamental tools, technologies, and methods required by the role' },
      { id: 'q2', label: '2. Accuracy, thoroughness, and reliability of completed technical deliverables' },
      { id: 'q3', label: '3. Problem-solving ability and analytical troubleshooting under supervision' },
      { id: 'q4', label: '4. Adherence to industry quality standards, documentation, and safety protocols' },
      { id: 'q5', label: '5. Productivity and ability to meet sprint or departmental deadlines' }
    ]
  },
  {
    sectionTitle: 'II. Work Habits, Punctuality & Attendance (25 Points)',
    items: [
      { id: 'q6', label: '6. Regularity of daily attendance and adherence to the shift schedule' },
      { id: 'q7', label: '7. Punctuality in reporting to the workstation and returning from breaks' },
      { id: 'q8', label: '8. Responsible stewardship of company equipment, data privacy, and resources' },
      { id: 'q9', label: '9. Orderliness, discipline, and compliance with company rules' },
      { id: '10', idKey: 'q10', label: '10. Consistency in logging daily and weekly accomplishment reports accurately' }
    ]
  },
  {
    sectionTitle: 'III. Communication, Teamwork & Professional Ethics (25 Points)',
    items: [
      { id: 'q11', label: '11. Clarity and professionalism in written and verbal communication' },
      { id: 'q12', label: '12. Receptiveness to constructive feedback and supervisor mentoring' },
      { id: 'q13', label: '13. Cooperation and collaboration with team members and staff' },
      { id: 'q14', label: '14. Courtesy, respect, and ethical conduct toward clients and colleagues' },
      { id: 'q15', label: '15. Composure and professionalism when handling workplace pressure' }
    ]
  },
  {
    sectionTitle: 'IV. Initiative, Adaptability & Overall Readiness (20 Points)',
    items: [
      { id: 'q16', label: '16. Resourcefulness and proactive initiative in seeking meaningful tasks' },
      { id: 'q17', label: '17. Speed of learning new domain workflows and software systems' },
      { id: 'q18', label: '18. Alignment of demonstrated skills with degree program outcomes' },
      { id: 'q19', label: '19. Overall industry readiness for entry-level employment' }
    ]
  }
];

export function renderSupervisorWorkspace(container, subRoute = 'dashboard') {
  const state = getState();
  const supervisor = state.currentUser;
  if (!supervisor) return;

  if (subRoute === 'messages') {
    renderMessagesWorkspace(container);
    return;
  }
  if (subRoute === 'interns') {
    renderSupervisorInterns(container, supervisor);
    return;
  }
  if (subRoute === 'approvals') {
    renderSupervisorApprovals(container, supervisor);
    return;
  }
  if (subRoute === 'postings') {
    renderSupervisorPostings(container, supervisor);
    return;
  }
  if (subRoute === 'evaluations') {
    renderSupervisorEvaluations(container, supervisor);
    return;
  }

  renderSupervisorDashboard(container, supervisor);
}

/* ==========================================================================
   1. SUPERVISOR DASHBOARD (SCOPED TO ASSIGNED COMPANY)
   ========================================================================== */
function renderSupervisorDashboard(container, supervisor) {
  const state = getState();
  const interns = getSupervisorScopedInterns();
  const logs = getScopedLogs();
  const disputes = getScopedDisputes();
  const myHte = getScopedHtes()[0];

  const pendingVerifications =
    logs.filter(l => l.status === 'Pending Supervisor Verification').length +
    disputes.filter(d => d.status === 'Pending Supervisor Verification').length;

  const myEvaluations = state.evaluations.filter(e => e.company === supervisor.company);

  container.innerHTML = `
    <div style="background: var(--nemsu-blue-50); border: 1px solid var(--nemsu-blue-100); border-left: 4px solid var(--nemsu-blue-900); border-radius: var(--radius-sm); padding: 0.85rem 1.15rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 0.65rem;">
        ${icon('lock', { size: 18 })}
        <div>
          <strong style="color: var(--nemsu-blue-900); font-size: 0.9rem;">
            Partner Workspace: ${esc(supervisor.company)}
          </strong>
          <div style="font-size: 0.78rem; color: var(--text-secondary);">
            Supervisor: ${esc(supervisor.name)} · Token: <code>${esc(myHte?.inviteToken || supervisor.inviteToken || 'HTE-PARTNER')}</code>
          </div>
        </div>
      </div>
      <span class="badge badge-success">${icon('shieldCheck', { size: 12 })} Company Scoped</span>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Assigned Interns</span>
        <div class="kpi-value">${interns.length}</div>
        <div class="kpi-sub">Slots filled: ${myHte ? `${myHte.filledSlots} / ${myHte.maxSlots}` : `${interns.length} active`}</div>
      </div>

      <div class="kpi-card gold">
        <span class="kpi-label">Pending Verifications</span>
        <div class="kpi-value">${pendingVerifications}</div>
        <div class="kpi-sub">Attendance and weekly reports</div>
      </div>

      <div class="kpi-card success">
        <span class="kpi-label">Verified Logs</span>
        <div class="kpi-value">${logs.filter(l => l.status === 'Supervisor Verified' || l.status === 'Coordinator Approved').length}</div>
        <div class="kpi-sub">Forwarded to college coordinators</div>
      </div>

      <div class="kpi-card purple">
        <span class="kpi-label">Completed Evaluations</span>
        <div class="kpi-value">${myEvaluations.length} / ${interns.length}</div>
        <div class="kpi-sub">19-item performance rubric</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('users', { size: 18 })} Interns at ${esc(supervisor.company)}</h3>
          <p class="card-subtitle">Monitor attendance, verify weekly reports, and submit final evaluations</p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <a href="#/supervisor/approvals" class="btn btn-sm btn-primary">Verify Logs (${pendingVerifications})</a>
          <a href="#/supervisor/evaluations" class="btn btn-sm btn-secondary">Evaluations</a>
        </div>
      </div>

      ${
        interns.length === 0
          ? renderEmptyState({
              iconName: 'building',
              title: `No interns assigned to ${supervisor.company}`,
              description: 'Only interns officially deployed to your company appear in this workspace.'
            })
          : `
        <div tabindex="0" role="region" aria-label="Assigned Interns" class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Intern</th>
                <th>College &amp; Program</th>
                <th>Role</th>
                <th>Hours</th>
                <th>Evaluation</th>
              </tr>
            </thead>
            <tbody>
              ${interns
                .map(stu => {
                  const stuHours = logs
                    .filter(l => (l.studentId === stu.id || l.student === stu.name) && l.status !== 'Rejected')
                    .reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
                  const quota = getCollegeQuotaHours(stu.college);
                  const ev = myEvaluations.find(e => e.studentId === stu.id || e.studentName === stu.name);
                  return `
                    <tr>
                      <th>
                        <div>${esc(stu.name)}</div>
                        <div style="font-size: 0.72rem; color: var(--text-secondary);">${esc(stu.studentNumber || stu.id)}</div>
                      </th>
                      <td data-label="College & Program">
                        <span class="badge badge-blue">${esc(stu.college)}</span>
                        <div style="font-size: 0.76rem; margin-top: 0.15rem;">${esc(stu.program)}</div>
                      </td>
                      <td data-label="Role">${esc(stu.assignedRole || 'Intern')}</td>
                      <td data-label="Hours"><strong>${stuHours} / ${quota} hrs</strong></td>
                      <td data-label="Evaluation">
                        ${
                          ev
                            ? `<span class="badge badge-success">${icon('check', { size: 12 })} ${ev.averageRating} / 5.00 (${ev.totalScore}/95)</span>`
                            : `<a href="#/supervisor/evaluations" class="btn btn-xs btn-primary">Evaluate</a>`
                        }
                      </td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      `
      }
    </div>
  `;
}

/* ==========================================================================
   2. ASSIGNED INTERNS DIRECTORY
   ========================================================================== */
function renderSupervisorInterns(container, supervisor) {
  const interns = getSupervisorScopedInterns();
  const logs = getScopedLogs();

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('graduationCap', { size: 18 })} Assigned Interns · ${esc(supervisor.company)}</h3>
          <p class="card-subtitle">Interns deployed to ${esc(supervisor.company)}</p>
        </div>
        <span class="badge badge-blue">${interns.length} Intern(s)</span>
      </div>

      ${
        interns.length === 0
          ? renderEmptyState({
              iconName: 'graduationCap',
              title: 'No assigned interns',
              description: `No interns have been deployed to ${supervisor.company} yet.`
            })
          : `
        <div class="grid-2">
          ${interns
            .map(stu => {
              const stuLogs = logs.filter(l => l.studentId === stu.id || l.student === stu.name);
              const hours = stuLogs.reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
              const quota = getCollegeQuotaHours(stu.college);
              return `
                <div style="border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.15rem; background: var(--surface-canvas);">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.65rem;">
                    <div>
                      <h4 style="color: var(--nemsu-blue-900); font-size: 1rem;">${esc(stu.name)}</h4>
                      <div style="font-size: 0.78rem; color: var(--text-secondary);">${esc(stu.program)} (${esc(stu.college)})</div>
                    </div>
                    ${renderStatusBadge(stu.placementStatus)}
                  </div>

                  <div style="font-size: 0.82rem; margin-bottom: 0.65rem;">
                    <div><strong>Role:</strong> ${esc(stu.assignedRole || 'Intern')}</div>
                    <div><strong>Start Date:</strong> ${esc(stu.deploymentStartDate || '2026-09-15')}</div>
                    <div><strong>Hours:</strong> <strong>${hours} / ${quota} hrs</strong></div>
                  </div>

                  <div style="margin-bottom: 0.75rem;">
                    <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.3rem;">Skills</div>
                    <div class="chip-list">
                      ${(stu.portfolioData?.skills || []).map(s => `<span class="chip matched" style="font-size: 0.7rem;">${esc(s)}</span>`).join('')}
                    </div>
                  </div>

                  <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                    <a href="#/supervisor/approvals" class="btn btn-xs btn-secondary">Review Logs (${stuLogs.length})</a>
                    <a href="#/supervisor/evaluations" class="btn btn-xs btn-primary">Evaluate</a>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      `
      }
    </div>
  `;
}

/* ==========================================================================
   3. ATTENDANCE & TASK VERIFICATION QUEUE
   ========================================================================== */
function renderSupervisorApprovals(container, supervisor) {
  const logs = getScopedLogs();
  const disputes = getScopedDisputes();

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('clipboardCheck', { size: 18 })} Time &amp; Task Verification · ${esc(supervisor.company)}</h3>
          <p class="card-subtitle">Verify intern attendance and weekly accomplishments before forwarding to their college coordinator</p>
        </div>
      </div>

      ${
        disputes.length > 0
          ? `
        <div style="margin-bottom: 1.25rem; padding: 1rem; background: var(--nemsu-gold-50); border: 1px solid var(--nemsu-gold-500); border-radius: var(--radius-sm);">
          <h4 style="font-size: 0.88rem; color: var(--nemsu-blue-900); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
            ${icon('clock', { size: 16 })} Attendance Adjustment Requests (${disputes.length})
          </h4>
          ${disputes
            .map(
              d => `
            <div style="background: var(--surface-white); padding: 0.75rem 1rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
              <div>
                <strong>${esc(d.studentName)}</strong> · <strong>${esc(d.targetDate)} (${d.requestedHours} hrs)</strong>
                <div style="font-size: 0.8rem; color: var(--text-primary); margin-top: 0.15rem;">${esc(d.reason)}</div>
              </div>
              <div style="display: flex; gap: 0.45rem; align-items: center;">
                ${renderStatusBadge(d.status)}
                ${
                  d.status === 'Pending Supervisor Verification'
                    ? `<button type="button" class="btn btn-xs btn-success" data-sup-verify-dispute="${d.id}">${icon('check', { size: 13 })} Verify Adjustment</button>`
                    : ''
                }
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      ${
        logs.length === 0
          ? renderEmptyState({ title: 'No logs submitted yet', description: `No attendance or weekly task logs have been submitted by interns at ${supervisor.company}.` })
          : `
        <div tabindex="0" role="region" aria-label="Supervisor Verification Queue" class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Intern</th>
                <th>Date / Week</th>
                <th>Summary</th>
                <th>Hours</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${logs
                .map(
                  l => `
                <tr>
                  <th>
                    <div>${esc(l.student)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-secondary);">${esc(l.college)}</div>
                  </th>
                  <td data-label="Date / Week">
                    <div>${esc(l.date)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-secondary);">Week ${esc(String(l.weekNumber || 6))}</div>
                  </td>
                  <td data-label="Summary">
                    <strong>${esc(l.title)}</strong>
                    <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.15rem;">${esc(l.description)}</div>
                  </td>
                  <td data-label="Hours"><strong>${l.hours} hrs</strong></td>
                  <td data-label="Status">${renderStatusBadge(l.status)}</td>
                  <td data-label="Actions">
                    <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                      <button type="button" class="btn btn-xs btn-success" data-sup-verify-log="${l.id}">
                        ${icon('check', { size: 13 })} Verify
                      </button>
                      <button type="button" class="btn btn-xs btn-danger-outline" data-sup-return-log="${l.id}">
                        ${icon('undo', { size: 13 })} Return
                      </button>
                    </div>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
      }
    </div>
  `;

  container.querySelectorAll('[data-sup-verify-dispute]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const dispId = btn.getAttribute('data-sup-verify-dispute');
      const disp = getState().dtrDisputes.find(d => d.id === dispId);
      if (!disp) return;
      disp.status = 'Supervisor Verified';
      disp.supervisorRemarks = `Verified by ${supervisor.name} (${supervisor.company}).`;
      await persistDatabase(false);
      renderSupervisorApprovals(container, supervisor);
      showToast({
        title: 'Adjustment verified',
        message: `Forwarded to ${disp.college} Coordinator for hour credit.`,
        type: 'success'
      });
    });
  });

  container.querySelectorAll('[data-sup-verify-log]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const logId = Number(btn.getAttribute('data-sup-verify-log'));
      const log = getState().logs.find(l => l.id === logId);
      if (!log) return;
      log.status = 'Supervisor Verified';
      log.supervisorVerifiedBy = supervisor.name;
      log.remarks = `Verified by ${supervisor.name} (${supervisor.company}).`;
      await persistDatabase(false);
      renderSupervisorApprovals(container, supervisor);
      showToast({
        title: 'Log verified',
        message: `Forwarded ${log.student}'s log to ${log.college} Coordinator.`,
        type: 'success'
      });
    });
  });

  container.querySelectorAll('[data-sup-return-log]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const logId = Number(btn.getAttribute('data-sup-return-log'));
      const log = getState().logs.find(l => l.id === logId);
      if (!log) return;

      const { confirmed, reason } = await openConfirmModal({
        title: 'Return log for correction',
        message: `Explain what needs to be updated in ${log.student}'s entry "${log.title}".`,
        confirmText: 'Return Log',
        variant: 'danger',
        requireReason: true,
        reasonLabel: 'Supervisor feedback'
      });
      if (!confirmed) return;

      log.status = 'Returned for Revision';
      log.remarks = `Supervisor (${supervisor.name}): ${reason}`;
      await persistDatabase(false);
      renderSupervisorApprovals(container, supervisor);
      showToast({ title: 'Log returned', message: reason, type: 'warning' });
    });
  });
}

/* ==========================================================================
   4. JOB POSTINGS & SLOT CAPACITY
   ========================================================================== */
function renderSupervisorPostings(container, supervisor) {
  const myHte = getScopedHtes()[0];
  if (!myHte) {
    container.innerHTML = renderEmptyState({
      title: 'No company profile linked',
      description: `No partner profile found for ${supervisor.company}.`
    });
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('briefcase', { size: 18 })} Job Postings &amp; Slot Capacity</h3>
          <p class="card-subtitle">Updating your role description or required skills refreshes student match rankings</p>
        </div>
        <span class="badge badge-gold">Token: ${esc(myHte.inviteToken)}</span>
      </div>

      <form id="sup-hte-posting-form">
        <div class="grid-3">
          <div class="form-group">
            <label class="form-label" for="sup-role-title">Position Title</label>
            <input type="text" id="sup-role-title" class="form-input" value="${esc(myHte.roleTitle)}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="sup-max-slots">Max Intern Slots</label>
            <input type="number" id="sup-max-slots" class="form-input" min="1" max="50" value="${myHte.maxSlots}" required />
            <span class="form-hint">Currently filled: ${myHte.filledSlots}</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="sup-min-gpa">GPA Requirement</label>
            <input type="number" id="sup-min-gpa" class="form-input" step="0.05" min="1.0" max="3.0" value="${myHte.minGpa}" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="sup-job-desc">Role Description &amp; Training Scope</label>
          <textarea id="sup-job-desc" class="form-textarea" rows="3" required>${esc(myHte.description)}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="sup-req-skills">Required Skills (Comma-separated)</label>
          <input type="text" id="sup-req-skills" class="form-input" value="${esc((myHte.requiredSkills || []).join(', '))}" required />
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button type="submit" class="btn btn-primary">${icon('check', { size: 15 })} Save Job Posting</button>
        </div>
      </form>
    </div>
  `;

  container.querySelector('#sup-hte-posting-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    myHte.roleTitle = container.querySelector('#sup-role-title')?.value.trim();
    myHte.maxSlots = Number(container.querySelector('#sup-max-slots')?.value) || 5;
    myHte.minGpa = Number(container.querySelector('#sup-min-gpa')?.value) || 2.25;
    myHte.description = container.querySelector('#sup-job-desc')?.value.trim();
    myHte.requiredSkills = (container.querySelector('#sup-req-skills')?.value || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    await persistDatabase(false);
    renderSupervisorPostings(container, supervisor);
    showToast({
      title: 'Job posting saved',
      message: `Updated ${myHte.name} requirements and slot capacity.`,
      type: 'success'
    });
  });
}

/* ==========================================================================
   5. 19-ITEM PERFORMANCE EVALUATION RUBRIC
   ========================================================================== */
let selectedEvalStudentId = null;

function renderSupervisorEvaluations(container, supervisor) {
  const state = getState();
  const interns = getSupervisorScopedInterns();

  if (interns.length === 0) {
    container.innerHTML = renderEmptyState({
      iconName: 'award',
      title: `No interns assigned to ${supervisor.company}`,
      description: 'Evaluations are available for interns deployed to your company.'
    });
    return;
  }

  if (!selectedEvalStudentId || !interns.some(i => i.id === selectedEvalStudentId)) {
    selectedEvalStudentId = interns[0].id;
  }

  const targetStu = interns.find(i => i.id === selectedEvalStudentId) || interns[0];
  const existingEval = state.evaluations.find(
    e => e.studentId === targetStu.id && e.company === supervisor.company
  );

  const defaultScores = existingEval?.scores || {
    q1: 5, q2: 5, q3: 5, q4: 5, q5: 5,
    q6: 5, q7: 5, q8: 5, q9: 5, q10: 5,
    q11: 5, q12: 5, q13: 5, q14: 5, q15: 5,
    q16: 5, q17: 5, q18: 5, q19: 5
  };

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('award', { size: 18 })} Intern Performance Evaluation (19-Item Rubric)</h3>
          <p class="card-subtitle">Saved evaluations are shared with the intern and their college OJT coordinator</p>
        </div>
        ${
          existingEval
            ? `<button type="button" class="btn btn-sm btn-secondary" id="btn-sup-print-eval">${icon('printer', { size: 14 })} Preview &amp; Print</button>`
            : `<span class="badge badge-blue">New Evaluation</span>`
        }
      </div>

      <form id="hte-19-rubric-form">
        <div class="grid-3" style="background: var(--surface-subtle); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1.25rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="eval-stu-select">Intern</label>
            <select id="eval-stu-select" class="form-select">
              ${interns
                .map(
                  i => `<option value="${i.id}" ${i.id === targetStu.id ? 'selected' : ''}>${esc(i.name)} (${esc(i.college)} · ${esc(i.program)})</option>`
                )
                .join('')}
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="eval-period">Evaluation Period</label>
            <input type="text" id="eval-period" class="form-input" value="${esc(existingEval?.evaluationPeriod || 'Final Assessment · 1st Semester, A.Y. 2026–2027')}" required />
          </div>

          <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-end;">
            <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Total Score</div>
            <div id="live-rubric-summary" style="font-size: 1.3rem; font-weight: 800; color: var(--nemsu-blue-900);">
              95 / 95 pts (5.00)
            </div>
          </div>
        </div>

        ${RUBRIC_SECTIONS.map(
          sec => `
          <div style="margin-bottom: 1.25rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); overflow: hidden;">
            <div style="background: var(--nemsu-blue-900); color: var(--surface-white); padding: 0.65rem 1rem; font-weight: 700; font-size: 0.86rem;">
              ${esc(sec.sectionTitle)}
            </div>
            <div style="padding: 0.75rem 1rem;">
              ${sec.items
                .map(item => {
                  const qKey = item.idKey || item.id;
                  const val = Number(defaultScores[qKey] || 5);
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.55rem 0; border-bottom: 1px solid var(--border-subtle); flex-wrap: wrap;">
                      <label for="rubric-${qKey}" style="font-size: 0.84rem; color: var(--text-primary); flex: 1;">
                        ${esc(item.label)}
                      </label>
                      <select id="rubric-${qKey}" data-rubric-q="${qKey}" class="form-select" style="width: 220px;">
                        <option value="5" ${val === 5 ? 'selected' : ''}>5 · Outstanding</option>
                        <option value="4" ${val === 4 ? 'selected' : ''}>4 · Very Satisfactory</option>
                        <option value="3" ${val === 3 ? 'selected' : ''}>3 · Satisfactory</option>
                        <option value="2" ${val === 2 ? 'selected' : ''}>2 · Fair</option>
                        <option value="1" ${val === 1 ? 'selected' : ''}>1 · Needs Improvement</option>
                      </select>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        `
        ).join('')}

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label" for="eval-strengths">Observed Strengths</label>
            <textarea id="eval-strengths" class="form-textarea" rows="3" required>${esc(existingEval?.strengths || 'Demonstrated strong mastery of technical workflows, proactive problem-solving, and reliable teamwork.')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="eval-improvements">Areas for Growth</label>
            <textarea id="eval-improvements" class="form-textarea" rows="3" required>${esc(existingEval?.areasForImprovement || 'Continue deepening exposure to production deployment and automated testing.')}</textarea>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button type="submit" class="btn btn-primary">
            ${icon('check', { size: 15 })} Save Evaluation
          </button>
        </div>
      </form>
    </div>
  `;

  const computeLiveScore = () => {
    const scores = {};
    let total = 0;
    container.querySelectorAll('[data-rubric-q]').forEach(sel => {
      const qId = sel.getAttribute('data-rubric-q');
      const v = Number(sel.value) || 5;
      scores[qId] = v;
      total += v;
    });
    const avg = Number((total / 19).toFixed(2));
    const pct = Math.round((total / 95) * 1000) / 10;
    const eq =
      avg >= 4.5
        ? `Outstanding (${pct}%)`
        : avg >= 3.5
        ? `Very Satisfactory (${pct}%)`
        : avg >= 2.5
        ? `Satisfactory (${pct}%)`
        : `Needs Improvement (${pct}%)`;
    const recommendation =
      avg >= 3.0
        ? 'Passed · Recommended for Final OJT Completion Clearance'
        : 'For Improvement · Remedial Coaching Recommended';

    const summaryEl = container.querySelector('#live-rubric-summary');
    if (summaryEl) {
      summaryEl.textContent = `${total} / 95 pts (${avg.toFixed(2)} · ${eq})`;
    }
    return { scores, totalScore: total, maxScore: 95, averageRating: avg, equivalentRating: eq, recommendation };
  };

  computeLiveScore();
  container.querySelectorAll('[data-rubric-q]').forEach(sel => {
    sel.addEventListener('change', computeLiveScore);
  });

  container.querySelector('#eval-stu-select')?.addEventListener('change', e => {
    selectedEvalStudentId = e.target.value;
    renderSupervisorEvaluations(container, supervisor);
  });

  container.querySelector('#btn-sup-print-eval')?.addEventListener('click', () => {
    if (existingEval) openEvaluationPreviewDialog(existingEval);
  });

  container.querySelector('#hte-19-rubric-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const calc = computeLiveScore();
    const evaluationPeriod = container.querySelector('#eval-period')?.value.trim();
    const strengths = container.querySelector('#eval-strengths')?.value.trim();
    const areasForImprovement = container.querySelector('#eval-improvements')?.value.trim();

    const record = {
      id: existingEval?.id || `EVAL-2026-${Date.now()}`,
      studentId: targetStu.id,
      studentName: targetStu.name,
      studentNumber: targetStu.studentNumber || targetStu.id,
      college: targetStu.college,
      program: targetStu.program,
      company: supervisor.company,
      supervisorId: supervisor.id,
      supervisorName: supervisor.name,
      supervisorTitle: supervisor.title || 'HTE Supervisor',
      evaluationPeriod,
      submittedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      scores: calc.scores,
      totalScore: calc.totalScore,
      maxScore: 95,
      averageRating: calc.averageRating,
      equivalentRating: calc.equivalentRating,
      recommendation: calc.recommendation,
      strengths,
      areasForImprovement,
      coordinatorClearanceStatus: existingEval?.coordinatorClearanceStatus || 'Pending Coordinator Final Clearance'
    };

    const idx = state.evaluations.findIndex(ev => ev.studentId === targetStu.id && ev.company === supervisor.company);
    if (idx >= 0) {
      state.evaluations[idx] = record;
    } else {
      state.evaluations.unshift(record);
    }

    await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });

    await recordAuditLog({
      actionType: 'HTE_EVALUATION_SUBMITTED',
      targetStudent: `${targetStu.name} (${targetStu.studentNumber || targetStu.id})`,
      summary: `Supervisor ${supervisor.name} submitted 19-item evaluation: ${calc.totalScore}/95 (${calc.averageRating}/5.00).`,
      ruleOrModelRef: '19-Item Performance Evaluation Rubric',
      originalDraft: '',
      finalDispatchedText: `${calc.equivalentRating} · ${calc.recommendation}`,
      college: targetStu.college
    });

    renderSupervisorEvaluations(container, supervisor);
    showToast({
      title: 'Evaluation saved',
      message: `Evaluation for ${targetStu.name} (${calc.totalScore}/95) shared with ${targetStu.college} Coordinator.`,
      type: 'success'
    });
  });
}
