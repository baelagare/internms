import {
  getState,
  persistDatabase,
  getScopedLogs,
  getScopedDisputes,
  getCollegeQuotaHours,
  recordAuditLog
} from '../../state/store.js';
import { computeSbertPlacementRankings, evaluateStage1Eligibility } from '../../services/sbertEngine.js';
import { showToast } from '../../components/ui/ToastManager.js';
import { openConfirmModal } from '../../components/ui/ConfirmModal.js';
import { openDocumentPreviewModal } from '../../components/ui/PdfPreviewModal.js';
import { renderStatusBadge, renderRuleBadge } from '../../components/ui/Badge.js';
import { renderEmptyState } from '../../components/ui/EmptyState.js';
import { renderMessagesWorkspace } from '../messaging/chatView.js';
import { icon } from '../../components/ui/Icons.js';
import { esc, confirmInPlace } from '../../utils/html.js';

export function renderStudentWorkspace(container, subRoute = 'dashboard') {
  const state = getState();
  const student = state.currentUser;
  if (!student) return;

  if (subRoute === 'messages') {
    renderMessagesWorkspace(container);
    return;
  }
  if (subRoute === 'profile') {
    renderStudentProfile(container, student);
    return;
  }
  if (subRoute === 'checklist') {
    renderStudentChecklist(container, student);
    return;
  }
  if (subRoute === 'attendance') {
    renderStudentAttendance(container, student);
    return;
  }
  if (subRoute === 'tasks') {
    renderStudentTasks(container, student);
    return;
  }
  if (subRoute === 'placement') {
    renderStudentPlacement(container, student);
    return;
  }

  renderStudentDashboard(container, student);
}

/* ==========================================================================
   1. STUDENT DASHBOARD & 6-STEP PROGRESS STEPPER
   ========================================================================== */
function renderStudentDashboard(container, student) {
  const state = getState();
  const logs = getScopedLogs();
  const approvedHours = logs
    .filter(l => l.status === 'Coordinator Approved' || l.status === 'Supervisor Verified' || l.status === 'Approved')
    .reduce((sum, l) => sum + (Number(l.hours) || 0), 0);
  const quotaHours = getCollegeQuotaHours(student.college);
  const progressPct = Math.min(100, Math.round((approvedHours / quotaHours) * 100));

  const docs = student.preDeploymentDocs || [];
  const verifiedDocs = docs.filter(d => d.status === 'Verified').length;

  const sbertRankings = computeSbertPlacementRankings(student, state.htes, state.collegeSettings);
  const topMatch = sbertRankings[0];

  const myAlerts = state.alerts.filter(a => a.studentId === student.id || a.student === student.name);
  const myEvaluation = state.evaluations.find(e => e.studentId === student.id || e.studentName === student.name);

  const steps = [
    { num: 'Step 1', title: 'Profile & Skills', status: (student.portfolioData?.skills?.length || 0) >= 3 ? 'completed' : 'active', href: '#/student/profile' },
    { num: 'Step 2', title: `Checklist (${verifiedDocs}/5)`, status: verifiedDocs === 5 ? 'completed' : 'active', href: '#/student/checklist' },
    { num: 'Step 3', title: 'Placement Choice', status: student.preferredHte ? 'completed' : 'active', href: '#/student/placement' },
    { num: 'Step 4', title: 'Coordinator Approval', status: student.placementStatus === 'Approved & Deployed' ? 'completed' : 'active', href: '#/student/placement' },
    { num: 'Step 5', title: `Attendance (${progressPct}%)`, status: progressPct >= 100 ? 'completed' : 'active', href: '#/student/attendance' },
    { num: 'Step 6', title: 'Final Evaluation', status: myEvaluation ? 'completed' : '', href: '#/student/dashboard' }
  ];

  container.innerHTML = `
    <nav class="lifecycle-stepper" aria-label="Internship Progress">
      ${steps
        .map(
          s => `
        <a href="${s.href}" class="step-node ${s.status}">
          <span class="step-node-num">${s.status === 'completed' ? icon('check', { size: 12 }) : ''} ${s.num}</span>
          <span class="step-node-title">${esc(s.title)}</span>
        </a>
      `
        )
        .join('')}
    </nav>

    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Hours Completed</span>
        <div class="kpi-value">${approvedHours} / ${quotaHours} hrs</div>
        <div class="kpi-sub">${progressPct}% of ${esc(student.college)} requirement</div>
      </div>

      <div class="kpi-card gold">
        <span class="kpi-label">Pre-Deployment Docs</span>
        <div class="kpi-value">${verifiedDocs} / ${docs.length || 5}</div>
        <div class="kpi-sub">${verifiedDocs === 5 ? 'All documents verified' : 'Pending items in Checklist'}</div>
      </div>

      <div class="kpi-card success">
        <span class="kpi-label">Placement Status</span>
        <div class="kpi-value" style="font-size: 1.15rem;">${esc(student.placementStatus || 'Unplaced')}</div>
        <div class="kpi-sub">${esc(student.company || 'Awaiting Coordinator Approval')}</div>
      </div>

      <div class="kpi-card ${myAlerts.length > 0 ? 'critical' : 'purple'}">
        <span class="kpi-label">Standing &amp; Evaluation</span>
        <div class="kpi-value" style="font-size: 1.2rem;">
          ${myEvaluation ? `${myEvaluation.averageRating} / 5.00` : myAlerts.length > 0 ? `${myAlerts.length} Advisory` : 'On Track'}
        </div>
        <div class="kpi-sub">${myEvaluation ? esc(myEvaluation.equivalentRating) : 'Monitored weekly'}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${icon('compass', { size: 18 })} Placement &amp; Top Match</h3>
            <p class="card-subtitle">Assigned host company and highest-ranked skill match</p>
          </div>
          ${renderStatusBadge(student.placementStatus || 'Unplaced')}
        </div>

        <div style="background: var(--surface-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 1rem; margin-bottom: 1rem;">
          <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Host Company</div>
          <div style="font-size: 1.05rem; font-weight: 800; color: var(--nemsu-blue-900); margin-top: 0.2rem;">
            ${esc(student.company || 'Unassigned')}
          </div>
          <div style="font-size: 0.84rem; color: var(--text-secondary); margin-top: 0.15rem;">
            Role: <strong>${esc(student.assignedRole || student.preferredRole || 'Pending approval')}</strong>
            · GPA: <strong>${Number(student.gpa || 1.75).toFixed(2)}</strong>
          </div>
        </div>

        ${
          topMatch
            ? `
          <div style="border: 1px solid var(--nemsu-gold-500); background: var(--nemsu-gold-50); border-radius: var(--radius-sm); padding: 1rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem;">
              <strong style="font-size: 0.88rem; color: var(--nemsu-blue-900);">Top Match: ${esc(topMatch.company)}</strong>
              <span class="badge badge-gold">${topMatch.matchPercent}% Match (${topMatch.cosineSimilarity.toFixed(2)})</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--nemsu-gold-800); margin-bottom: 0.75rem;">
              ${esc(topMatch.reasoning)}
            </p>
            <a href="#/student/placement" class="btn btn-sm btn-primary">
              View All Matches ${icon('arrowRight', { size: 14 })}
            </a>
          </div>
        `
            : ''
        }
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${icon('award', { size: 18 })} Evaluation &amp; Advisories</h3>
            <p class="card-subtitle">Supervisor performance rating and coordinator notices</p>
          </div>
          ${
            myEvaluation
              ? `<button type="button" class="btn btn-sm btn-secondary" id="btn-stu-view-eval">${icon('eye', { size: 14 })} View Rubric</button>`
              : `<span class="badge badge-neutral">Pending Evaluation</span>`
          }
        </div>

        ${
          myEvaluation
            ? `
          <div style="background: var(--status-success-bg); border: 1px solid var(--status-success-border); border-radius: var(--radius-sm); padding: 1rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: var(--status-success-text); font-size: 0.9rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                ${icon('checkCircle', { size: 16 })} ${esc(myEvaluation.recommendation)}
              </strong>
              <span class="badge badge-success">${myEvaluation.totalScore}/${myEvaluation.maxScore} (${myEvaluation.averageRating})</span>
            </div>
            <p style="font-size: 0.82rem; color: var(--text-primary); margin-top: 0.45rem;">
              <strong>Strengths:</strong> ${esc(myEvaluation.strengths)}
            </p>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.35rem;">
              Supervisor: ${esc(myEvaluation.supervisorName)} · Clearance: <strong>${esc(myEvaluation.coordinatorClearanceStatus)}</strong>
            </div>
          </div>
        `
            : ''
        }

        ${
          myAlerts.length > 0
            ? myAlerts
                .map(
                  a => `
              <div style="background: var(--rule-a-bg); border: 1px solid var(--rule-a-border); border-radius: var(--radius-sm); padding: 0.9rem; margin-bottom: 0.75rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.35rem;">
                  ${renderRuleBadge(a.ruleId)}
                  <span style="font-size: 0.74rem; color: var(--text-secondary);">${esc(a.triggeredAt || '')}</span>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-primary);">${esc(a.draftMessage)}</p>
              </div>
            `
                )
                .join('')
            : `<p style="font-size: 0.84rem; color: var(--text-secondary);">No active advisories. Keep logging your daily time and weekly tasks on schedule.</p>`
        }
      </div>
    </div>
  `;

  container.querySelector('#btn-stu-view-eval')?.addEventListener('click', () => {
    if (myEvaluation) openEvaluationPreviewDialog(myEvaluation);
  });
}

export function openEvaluationPreviewDialog(ev) {
  openDocumentPreviewModal({
    title: `Performance Evaluation · ${ev.studentName}`,
    subtitle: `${ev.company} · Evaluated by ${ev.supervisorName}`,
    documentBodyHtml: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; font-size: 0.85rem; background: var(--surface-subtle); padding: 1rem; border-radius: var(--radius-sm);">
        <div>
          <div><strong>Intern:</strong> ${esc(ev.studentName)} (${esc(ev.studentNumber || '')})</div>
          <div><strong>Program:</strong> ${esc(ev.college)} · ${esc(ev.program)}</div>
          <div><strong>Company:</strong> ${esc(ev.company)}</div>
        </div>
        <div>
          <div><strong>Period:</strong> ${esc(ev.evaluationPeriod)}</div>
          <div><strong>Score:</strong> <strong>${ev.totalScore} / ${ev.maxScore}</strong> (Avg: <strong>${ev.averageRating} / 5.00</strong>)</div>
          <div><strong>Rating:</strong> <strong>${esc(ev.equivalentRating)}</strong></div>
        </div>
      </div>
      <div style="margin-bottom: 1rem;">
        <h4 style="font-size: 0.9rem; color: var(--nemsu-blue-900); margin-bottom: 0.4rem;">Supervisor Feedback</h4>
        <p style="font-size: 0.85rem; color: var(--text-primary); margin-bottom: 0.5rem;"><strong>Strengths:</strong> ${esc(ev.strengths)}</p>
        <p style="font-size: 0.85rem; color: var(--text-primary);"><strong>Areas for Growth:</strong> ${esc(ev.areasForImprovement)}</p>
      </div>
      <div style="padding: 0.85rem 1rem; border-radius: var(--radius-sm); background: var(--status-success-bg); border: 1px solid var(--status-success-border); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: var(--status-success-text);">Recommendation: ${esc(ev.recommendation)}</strong>
          <div style="font-size: 0.78rem; color: var(--text-secondary);">Coordinator Clearance: <strong>${esc(ev.coordinatorClearanceStatus)}</strong></div>
        </div>
        ${renderStatusBadge(ev.coordinatorClearanceStatus)}
      </div>
    `
  });
}

/* ==========================================================================
   2. STUDENT PROFILE & RESUME BUILDER
   ========================================================================== */
function renderStudentProfile(container, student) {
  const portfolio = student.portfolioData || {};
  const skills = Array.isArray(portfolio.skills) ? portfolio.skills : [];
  const coursework = Array.isArray(portfolio.coursework) ? portfolio.coursework : [];
  const achievements = Array.isArray(portfolio.achievements) ? portfolio.achievements : [];

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('user', { size: 18 })} Academic Profile &amp; Resume</h3>
          <p class="card-subtitle">Updating your GPA, skills, or coursework recalculates your placement matches</p>
        </div>
        <a href="#/student/placement" class="btn btn-sm btn-secondary">
          View Matches ${icon('arrowRight', { size: 14 })}
        </a>
      </div>

      <form id="stu-profile-form" novalidate>
        <div class="grid-3">
          <div class="form-group">
            <label class="form-label" for="prof-gpa">GPA (1.00 Highest – 3.00 Passing)</label>
            <input type="number" id="prof-gpa" class="form-input" step="0.01" min="1.00" max="5.00" value="${Number(student.gpa || 1.75).toFixed(2)}" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="prof-standing">Academic Standing</label>
            <select id="prof-standing" class="form-select">
              <option value="Dean's Lister" ${student.academicStanding === "Dean's Lister" ? 'selected' : ''}>Dean's Lister</option>
              <option value="Regular Standing" ${student.academicStanding === 'Regular Standing' ? 'selected' : ''}>Regular Standing</option>
              <option value="Probationary" ${student.academicStanding === 'Probationary' ? 'selected' : ''}>Probationary</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="prof-clearance">Disciplinary Clearance</label>
            <input type="text" id="prof-clearance" class="form-input" value="${esc(student.disciplinaryClearance || 'Cleared')}" readonly style="background: var(--surface-subtle); font-weight: 700; color: var(--status-success-text);" />
          </div>
        </div>

        <div class="grid-3">
          <div class="form-group">
            <label class="form-label" for="prof-email">Institutional Email</label>
            <input type="email" id="prof-email" name="email" class="form-input" autocomplete="email" spellcheck="false" value="${esc(portfolio.email || student.email || '')}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="prof-phone">Mobile Number</label>
            <input type="tel" id="prof-phone" name="phone" class="form-input" autocomplete="tel" inputmode="tel" value="${esc(portfolio.phone || '')}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="prof-url">Portfolio / GitHub URL</label>
            <input type="url" id="prof-url" name="portfolioUrl" class="form-input" autocomplete="url" spellcheck="false" value="${esc(portfolio.portfolioUrl || '')}" placeholder="https://github.com/username…" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="prof-bio">Career Summary</label>
          <textarea id="prof-bio" name="bio" class="form-textarea" rows="3" required>${esc(portfolio.bio || '')}</textarea>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button type="submit" id="btn-save-student-profile" class="btn btn-primary">${icon('check', { size: 15 })} Save Profile</button>
        </div>
      </form>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${icon('sparkles', { size: 18 })} Skills (${skills.length})</h3>
            <p class="card-subtitle">Technical and professional skills matched against partner postings</p>
          </div>
        </div>

        <div class="chip-list" style="margin-bottom: 1rem;">
          ${skills
            .map(
              (sk, idx) => `
            <span class="chip matched">
              ${esc(sk)}
              <button type="button" class="chip-remove-btn" data-remove-skill="${idx}" aria-label="Remove ${esc(sk)}">
                ${icon('x', { size: 12 })}
              </button>
            </span>
          `
            )
            .join('')}
        </div>

        <form id="add-skill-form" style="display: flex; gap: 0.5rem;">
          <label for="new-skill-input" class="sr-only">Add Skill</label>
          <input type="text" id="new-skill-input" class="form-input" placeholder="e.g., Docker, QA Testing, AutoCAD…" required />
          <button type="submit" class="btn btn-secondary">${icon('plus', { size: 15 })} Add</button>
        </form>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${icon('bookOpen', { size: 18 })} Completed Coursework (${coursework.length})</h3>
            <p class="card-subtitle">Relevant subjects under ${esc(student.program)}</p>
          </div>
        </div>

        <div class="chip-list" style="margin-bottom: 1rem;">
          ${coursework
            .map(
              (cw, idx) => `
            <span class="chip">
              ${esc(cw)}
              <button type="button" class="chip-remove-btn" data-remove-course="${idx}" aria-label="Remove ${esc(cw)}">
                ${icon('x', { size: 12 })}
              </button>
            </span>
          `
            )
            .join('')}
        </div>

        <form id="add-course-form" style="display: flex; gap: 0.5rem;">
          <label for="new-course-input" class="sr-only">Add Coursework</label>
          <input type="text" id="new-course-input" class="form-input" placeholder="e.g., CS 402: Cloud Computing" required />
          <button type="submit" class="btn btn-secondary">${icon('plus', { size: 15 })} Add</button>
        </form>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${icon('fileText', { size: 18 })} Resume / CV</h3>
            <p class="card-subtitle">Upload your latest PDF or DOCX resume for coordinator and host review</p>
          </div>
        </div>

        ${
          portfolio.resume
            ? `
          <div style="background: var(--surface-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.9rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem;">
              ${icon('paperclip', { size: 16 })}
              <div>
                <strong style="color: var(--nemsu-blue-900); font-size: 0.88rem;">${esc(portfolio.resume.fileName)}</strong>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">Uploaded ${esc(portfolio.resume.uploadedAt)} · ${esc(portfolio.resume.fileSize || 'PDF')}</div>
              </div>
            </div>
            <div style="display: flex; gap: 0.45rem;">
              <button type="button" class="btn btn-xs btn-secondary" id="btn-preview-resume">${icon('eye', { size: 13 })} Preview</button>
              <button type="button" class="btn btn-xs btn-danger-outline" id="btn-delete-resume">${icon('trash', { size: 13 })} Remove</button>
            </div>
          </div>
        `
            : `<p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 1rem;">No resume uploaded yet.</p>`
        }

        <div>
          <input type="file" id="stu-resume-file" class="sr-only" accept=".pdf,.doc,.docx" />
          <label for="stu-resume-file" class="btn btn-secondary" style="cursor: pointer;">
            ${icon('upload', { size: 15 })} ${portfolio.resume ? 'Replace Resume' : 'Upload Resume'}
          </label>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${icon('award', { size: 18 })} Achievements &amp; Projects</h3>
            <p class="card-subtitle">Academic honors, certifications, and capstone projects</p>
          </div>
        </div>

        ${
          achievements.length === 0
            ? `<p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.85rem;">No achievements added yet.</p>`
            : achievements
                .map(
                  (ach, idx) => `
              <div style="padding: 0.75rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); margin-bottom: 0.6rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem;">
                <div>
                  <strong style="font-size: 0.85rem; color: var(--nemsu-blue-900);">${esc(ach.title)}</strong>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">${esc(ach.issuer)} · ${esc(ach.date)}</div>
                  <div style="font-size: 0.8rem; color: var(--text-primary); margin-top: 0.2rem;">${esc(ach.description)}</div>
                </div>
                <button type="button" class="btn btn-xs btn-danger-outline" data-delete-ach="${idx}">${icon('trash', { size: 13 })}</button>
              </div>
            `
                )
                .join('')
        }

        <details class="progressive-details" style="margin-top: 0.75rem;">
          <summary>${icon('plus', { size: 14 })} Add Achievement or Project</summary>
          <form id="add-ach-form" style="margin-top: 0.75rem;">
            <div class="grid-2" style="gap: 0.5rem;">
              <input type="text" id="ach-title" class="form-input" placeholder="Title" required />
              <input type="text" id="ach-issuer" class="form-input" placeholder="Organization / Event" required />
            </div>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
              <input type="text" id="ach-desc" class="form-input" placeholder="Brief description…" required />
              <button type="submit" class="btn btn-primary btn-sm">Add</button>
            </div>
          </form>
        </details>
      </div>
    </div>
  `;

  container.querySelector('#stu-profile-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    student.gpa = Number(container.querySelector('#prof-gpa')?.value) || 1.75;
    student.academicStanding = container.querySelector('#prof-standing')?.value || 'Regular Standing';
    student.portfolioData = student.portfolioData || {};
    student.portfolioData.email = container.querySelector('#prof-email')?.value.trim();
    student.portfolioData.phone = container.querySelector('#prof-phone')?.value.trim();
    student.portfolioData.portfolioUrl = container.querySelector('#prof-url')?.value.trim();
    student.portfolioData.bio = container.querySelector('#prof-bio')?.value.trim();

    await persistDatabase();
    confirmInPlace(
      container.querySelector('#btn-save-student-profile'),
      `${icon('checkCircle', { size: 15 })} Profile Saved`
    );
    showToast({
      title: 'Profile saved',
      message: `GPA (${student.gpa.toFixed(2)}) and profile updated.`,
      type: 'success'
    });
  });

  container.querySelector('#add-skill-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const val = container.querySelector('#new-skill-input')?.value.trim();
    if (!val) return;
    student.portfolioData.skills = [...skills, val];
    await persistDatabase(false);
    renderStudentProfile(container, student);
    showToast({
      title: 'Skill added',
      message: `"${val}" added and placement scores updated.`,
      type: 'success'
    });
  });

  container.querySelectorAll('[data-remove-skill]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.getAttribute('data-remove-skill'));
      const removedSkill = skills[idx];
      const snapshot = [...skills];
      student.portfolioData.skills.splice(idx, 1);
      await persistDatabase(false);
      renderStudentProfile(container, student);

      showToast({
        title: 'Skill removed',
        message: `Removed "${removedSkill}".`,
        type: 'warning',
        onUndo: async () => {
          student.portfolioData.skills = snapshot;
          await persistDatabase(false);
          renderStudentProfile(container, student);
          showToast({ title: 'Restored', message: `Restored "${removedSkill}".`, type: 'success' });
        }
      });
    });
  });

  container.querySelector('#add-course-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const val = container.querySelector('#new-course-input')?.value.trim();
    if (!val) return;
    student.portfolioData.coursework = [...coursework, val];
    await persistDatabase(false);
    renderStudentProfile(container, student);
    showToast({ title: 'Coursework added', message: `"${val}" added to profile.`, type: 'success' });
  });

  container.querySelectorAll('[data-remove-course]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.getAttribute('data-remove-course'));
      const removed = coursework[idx];
      const snapshot = [...coursework];
      student.portfolioData.coursework.splice(idx, 1);
      await persistDatabase(false);
      renderStudentProfile(container, student);
      showToast({
        title: 'Coursework removed',
        message: `Removed "${removed}".`,
        type: 'warning',
        onUndo: async () => {
          student.portfolioData.coursework = snapshot;
          await persistDatabase(false);
          renderStudentProfile(container, student);
        }
      });
    });
  });

  container.querySelector('#stu-resume-file')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    student.portfolioData.resume = {
      fileName: file.name,
      uploadedAt: new Date().toISOString().slice(0, 10),
      fileSize: `${Math.max(12, Math.round(file.size / 1024))} KB`
    };
    await persistDatabase(false);
    renderStudentProfile(container, student);
    showToast({ title: 'Resume uploaded', message: `${file.name} saved.`, type: 'success' });
  });

  container.querySelector('#btn-preview-resume')?.addEventListener('click', () => {
    openDocumentPreviewModal({
      title: `Curriculum Vitae · ${student.name}`,
      subtitle: `${student.program} (${student.college}) · GPA: ${Number(student.gpa || 1.75).toFixed(2)}`,
      documentBodyHtml: `
        <h4 style="color: var(--nemsu-blue-900); margin-bottom: 0.5rem;">${esc(student.name)}</h4>
        <p style="font-size: 0.85rem; margin-bottom: 1rem;">${esc(portfolio.email)} · ${esc(portfolio.phone)} · ${esc(portfolio.portfolioUrl || '')}</p>
        <p style="font-size: 0.88rem; color: var(--text-primary); margin-bottom: 1rem;">${esc(portfolio.bio)}</p>
        <h5 style="color: var(--nemsu-blue-900); margin-bottom: 0.35rem;">Skills</h5>
        <p style="font-size: 0.84rem; margin-bottom: 1rem;">${skills.map(esc).join(' • ')}</p>
        <h5 style="color: var(--nemsu-blue-900); margin-bottom: 0.35rem;">Completed Coursework</h5>
        <p style="font-size: 0.84rem;">${coursework.map(esc).join(' • ')}</p>
      `
    });
  });

  container.querySelector('#btn-delete-resume')?.addEventListener('click', async () => {
    const { confirmed } = await openConfirmModal({
      title: 'Remove resume?',
      message: `Remove "${portfolio.resume?.fileName}" from your profile?`,
      confirmText: 'Remove',
      variant: 'danger'
    });
    if (!confirmed) return;
    const prevResume = { ...portfolio.resume };
    student.portfolioData.resume = null;
    await persistDatabase(false);
    renderStudentProfile(container, student);
    showToast({
      title: 'Resume removed',
      message: 'Your CV file was removed.',
      type: 'warning',
      onUndo: async () => {
        student.portfolioData.resume = prevResume;
        await persistDatabase(false);
        renderStudentProfile(container, student);
        showToast({ title: 'Restored', message: `${prevResume.fileName} restored.`, type: 'success' });
      }
    });
  });

  container.querySelector('#add-ach-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const title = container.querySelector('#ach-title')?.value.trim();
    const issuer = container.querySelector('#ach-issuer')?.value.trim();
    const description = container.querySelector('#ach-desc')?.value.trim();
    if (!title || !issuer) return;
    student.portfolioData.achievements = [
      ...achievements,
      { id: Date.now(), title, issuer, date: '2026', description }
    ];
    await persistDatabase(false);
    renderStudentProfile(container, student);
    showToast({ title: 'Achievement added', message: title, type: 'success' });
  });

  container.querySelectorAll('[data-delete-ach]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.getAttribute('data-delete-ach'));
      const item = achievements[idx];
      const { confirmed } = await openConfirmModal({
        title: 'Delete achievement?',
        message: `Remove "${item?.title}" from your profile?`,
        confirmText: 'Delete',
        variant: 'danger'
      });
      if (!confirmed) return;
      const snapshot = [...achievements];
      student.portfolioData.achievements.splice(idx, 1);
      await persistDatabase(false);
      renderStudentProfile(container, student);
      showToast({
        title: 'Achievement deleted',
        message: item?.title,
        type: 'warning',
        onUndo: async () => {
          student.portfolioData.achievements = snapshot;
          await persistDatabase(false);
          renderStudentProfile(container, student);
        }
      });
    });
  });
}

/* ==========================================================================
   3. PRE-DEPLOYMENT DOCUMENT CHECKLIST
   ========================================================================== */
function renderStudentChecklist(container, student) {
  const docs = Array.isArray(student.preDeploymentDocs) ? student.preDeploymentDocs : [];
  const verifiedCount = docs.filter(d => d.status === 'Verified').length;

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('clipboardCheck', { size: 18 })} Pre-Deployment Checklist</h3>
          <p class="card-subtitle">Upload all 5 required documents for ${esc(student.college)} Coordinator verification</p>
        </div>
        <span class="badge ${verifiedCount === 5 ? 'badge-success' : 'badge-rule-b'}">${verifiedCount} / 5 Verified</span>
      </div>

      <div tabindex="0" role="region" aria-label="Pre-Deployment Checklist" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Issued By</th>
              <th>File</th>
              <th>Status</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${docs
              .map(
                (doc, idx) => `
              <tr>
                <th>
                  <div style="font-size: 0.72rem; color: var(--nemsu-blue-700); font-weight: 800;">${esc(doc.code)}</div>
                  <div>${esc(doc.title)}</div>
                </th>
                <td data-label="Issued By">${esc(doc.issuer)}</td>
                <td data-label="File">
                  ${
                    doc.fileName
                      ? `<span class="mono" style="font-size: 0.78rem; color: var(--nemsu-blue-900);">${esc(doc.fileName)}</span><div style="font-size: 0.7rem; color: var(--text-secondary);">${esc(doc.uploadedAt || '')}</div>`
                      : `<span style="color: var(--text-muted); font-size: 0.8rem;">Not uploaded</span>`
                  }
                </td>
                <td data-label="Status">${renderStatusBadge(doc.status)}</td>
                <td data-label="Remarks" style="max-width: 240px; font-size: 0.8rem; color: ${doc.status === 'Returned for Revision' ? 'var(--rule-a-text)' : 'var(--text-secondary)'};">
                  ${esc(doc.remarks || '-')}
                </td>
                <td data-label="Actions">
                  <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                    ${
                      doc.fileName
                        ? `<button type="button" class="btn btn-xs btn-secondary" data-preview-doc="${idx}">${icon('eye', { size: 13 })} Preview</button>`
                        : ''
                    }
                    <input type="file" id="doc-upload-${idx}" class="sr-only" accept=".pdf,.png,.jpg,.jpeg" data-upload-doc="${idx}" />
                    <label for="doc-upload-${idx}" class="btn btn-xs btn-primary" style="cursor: pointer;">
                      ${icon('upload', { size: 13 })} ${doc.fileName ? 'Replace' : 'Upload'}
                    </label>
                  </div>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-upload-doc]').forEach(input => {
    input.addEventListener('change', async e => {
      const idx = Number(input.getAttribute('data-upload-doc'));
      const file = e.target.files?.[0];
      const doc = docs[idx];
      if (!doc) return;

      doc.fileName = file ? file.name : `${doc.id}_${student.id}_2026.pdf`;
      doc.uploadedAt = new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
      doc.status = 'Pending Verification';
      doc.remarks = 'Submitted for coordinator verification.';

      await persistDatabase(false);
      renderStudentChecklist(container, student);
      showToast({
        title: `${doc.code} uploaded`,
        message: `"${doc.fileName}" sent for coordinator review.`,
        type: 'success'
      });
    });
  });

  container.querySelectorAll('[data-preview-doc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-preview-doc'));
      const doc = docs[idx];
      if (!doc) return;
      openDocumentPreviewModal({
        title: `${doc.code}: ${doc.title}`,
        subtitle: `Student: ${student.name} (${student.studentNumber || student.id}) · ${student.college}`,
        documentBodyHtml: `
          <div style="padding: 1rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); background: var(--surface-subtle); margin-bottom: 1rem;">
            <div><strong>Document:</strong> ${esc(doc.title)}</div>
            <div><strong>Issued By:</strong> ${esc(doc.issuer)}</div>
            <div><strong>File:</strong> <code>${esc(doc.fileName || '')}</code></div>
            <div><strong>Status:</strong> ${esc(doc.status)}</div>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-primary); line-height: 1.6;">
            This certifies that <strong>${esc(student.name)}</strong>, a 4th-year student of
            <strong>${esc(student.program)} (${esc(student.college)})</strong> at North Eastern Mindanao State University
            Main Campus, has submitted <strong>${esc(doc.title)}</strong> in compliance with
            CHED CMO No. 104, s. 2017 for Academic Year 2026–2027.
          </p>
        `
      });
    });
  });
}

/* ==========================================================================
   4. ATTENDANCE (DTR LOGGING, CSC FORM 48 & DISPUTES)
   ========================================================================== */
function renderStudentAttendance(container, student) {
  const logs = getScopedLogs().filter(l => l.kind === 'attendance' || l.amIn || l.punchType);
  const disputes = getScopedDisputes();
  const quotaHours = getCollegeQuotaHours(student.college);
  const completedHours = getScopedLogs()
    .filter(l => l.status === 'Coordinator Approved' || l.status === 'Supervisor Verified' || l.status === 'Approved')
    .reduce((sum, l) => sum + (Number(l.hours) || 0), 0);

  container.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${icon('clock', { size: 18 })} Record Daily Attendance</h3>
            <p class="card-subtitle">Log your shift hours and daily summary for supervisor verification</p>
          </div>
          <span class="badge badge-blue">${completedHours} / ${quotaHours} hrs</span>
        </div>

        <form id="dtr-punch-form">
          <div class="grid-2" style="gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label" for="dtr-date">Date</label>
              <input type="date" id="dtr-date" class="form-input" value="2026-11-02" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="dtr-punch-type">Shift</label>
              <select id="dtr-punch-type" class="form-select">
                <option value="FULL_DAY">Full Day (08:00–12:00, 01:00–05:00 · 8 hrs)</option>
                <option value="AM_SESSION">Morning Shift (08:00–12:00 · 4 hrs)</option>
                <option value="PM_SESSION">Afternoon Shift (01:00–05:00 · 4 hrs)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="dtr-summary">Work Summary</label>
            <input type="text" id="dtr-summary" class="form-input" placeholder="e.g., Completed database migration and API tests" required />
          </div>

          <details class="progressive-details" style="margin-bottom: 0.9rem;">
            <summary>${icon('paperclip', { size: 14 })} Attach optional log sheet or screenshot</summary>
            <div class="form-group" style="margin-top: 0.65rem; margin-bottom: 0;">
              <input type="file" id="dtr-optional-file" class="form-input" accept=".png,.jpg,.jpeg,.pdf" />
            </div>
          </details>

          <div style="display: flex; gap: 0.65rem; justify-content: space-between; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary" id="btn-open-dtr-dispute">
              Request Adjustment
            </button>
            <button type="submit" class="btn btn-primary">
              ${icon('check', { size: 15 })} Log Attendance
            </button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${icon('printer', { size: 18 })} CSC Form 48 &amp; Adjustments</h3>
            <p class="card-subtitle">Export printable Civil Service Form No. 48 or track adjustment requests</p>
          </div>
          <button type="button" class="btn btn-sm btn-secondary" id="btn-preview-csc48">
            ${icon('printer', { size: 14 })} Preview Form 48
          </button>
        </div>

        <h4 style="font-size: 0.82rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.5rem;">
          Adjustment Requests (${disputes.length})
        </h4>
        ${
          disputes.length === 0
            ? `<p style="font-size: 0.82rem; color: var(--text-secondary);">No retroactive adjustment requests filed.</p>`
            : disputes
                .map(
                  d => `
              <div style="padding: 0.75rem; background: var(--surface-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); margin-bottom: 0.6rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <strong style="font-size: 0.84rem; color: var(--nemsu-blue-900);">${esc(d.targetDate)} (${d.requestedHours} hrs)</strong>
                  ${renderStatusBadge(d.status)}
                </div>
                <p style="font-size: 0.78rem; color: var(--text-primary); margin-top: 0.25rem;">${esc(d.reason)}</p>
                ${d.supervisorRemarks ? `<div style="font-size: 0.74rem; color: var(--status-success-text); margin-top: 0.2rem;">Supervisor: ${esc(d.supervisorRemarks)}</div>` : ''}
              </div>
            `
                )
                .join('')
        }
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('calendar', { size: 18 })} Attendance History</h3>
          <p class="card-subtitle">Verified by your Host Supervisor and approved by your College Coordinator</p>
        </div>
      </div>

      <div tabindex="0" role="region" aria-label="Attendance History" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Morning</th>
              <th>Afternoon</th>
              <th>Hours</th>
              <th>Summary</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${logs
              .map(
                l => `
              <tr>
                <th>${esc(l.date)}</th>
                <td data-label="Morning">${esc(l.amIn || '08:00 AM')} – ${esc(l.amOut || '12:00 PM')}</td>
                <td data-label="Afternoon">${esc(l.pmIn || '01:00 PM')} – ${esc(l.pmOut || '05:00 PM')}</td>
                <td data-label="Hours"><strong>${Number(l.hours || 8).toFixed(1)} hrs</strong></td>
                <td data-label="Summary">${esc(l.title || l.description)}</td>
                <td data-label="Status">${renderStatusBadge(l.status)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#dtr-punch-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const date = container.querySelector('#dtr-date')?.value;
    const mode = container.querySelector('#dtr-punch-type')?.value;
    const summary = container.querySelector('#dtr-summary')?.value.trim();
    if (!date || !summary) return;

    const hours = mode === 'FULL_DAY' ? 8 : 4;
    const newLog = {
      id: Date.now(),
      studentId: student.id,
      student: student.name,
      college: student.college,
      company: student.company,
      date,
      weekNumber: 7,
      kind: 'attendance',
      punchType: mode,
      amIn: mode !== 'PM_SESSION' ? '08:00 AM' : '-',
      amOut: mode !== 'PM_SESSION' ? '12:00 PM' : '-',
      pmIn: mode !== 'AM_SESSION' ? '01:00 PM' : '-',
      pmOut: mode !== 'AM_SESSION' ? '05:00 PM' : '-',
      period: mode === 'FULL_DAY' ? 'Full Day (AM & PM)' : mode,
      title: summary,
      hours,
      description: summary,
      status: 'Pending Supervisor Verification',
      supervisorVerifiedBy: null,
      coordinatorApprovedBy: null,
      remarks: ''
    };

    getState().logs.unshift(newLog);
    await persistDatabase(false);
    renderStudentAttendance(container, student);
    showToast({
      title: 'Attendance logged',
      message: `Recorded ${hours} hrs for ${date}.`,
      type: 'success'
    });
  });

  container.querySelector('#btn-open-dtr-dispute')?.addEventListener('click', () => {
    openRetroactiveDisputeDialog(container, student);
  });

  container.querySelector('#btn-preview-csc48')?.addEventListener('click', () => {
    openDocumentPreviewModal({
      title: 'Civil Service Form No. 48 · Daily Time Record',
      subtitle: `${student.name} · ${student.program} (${student.college}) · Host: ${student.company}`,
      documentBodyHtml: `
        <div style="text-align: center; margin-bottom: 1rem;">
          <h4 style="color: var(--nemsu-blue-900);">CIVIL SERVICE FORM NO. 48 · DAILY TIME RECORD</h4>
          <p style="font-size: 0.82rem;">Intern: <strong>${esc(student.name)}</strong> · Host: <strong>${esc(student.company)}</strong> · Quota: <strong>${quotaHours} Hours</strong></p>
        </div>
        <table class="data-table" style="border: 1px solid var(--border-strong);">
          <thead>
            <tr>
              <th>Date</th>
              <th>AM In</th>
              <th>AM Out</th>
              <th>PM In</th>
              <th>PM Out</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${logs
              .map(
                l => `
              <tr>
                <td>${esc(l.date)}</td>
                <td>${esc(l.amIn || '08:00 AM')}</td>
                <td>${esc(l.amOut || '12:00 PM')}</td>
                <td>${esc(l.pmIn || '01:00 PM')}</td>
                <td>${esc(l.pmOut || '05:00 PM')}</td>
                <td><strong>${l.hours} hrs</strong></td>
                <td>${esc(l.status)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem; font-size: 0.82rem;">
          <div style="border-top: 1px solid #000; padding-top: 0.35rem; text-align: center;">
            <strong>${esc(student.name)}</strong><br/>Student Intern Signature
          </div>
          <div style="border-top: 1px solid #000; padding-top: 0.35rem; text-align: center;">
            <strong>Host Supervisor &amp; ${esc(student.college)} Coordinator</strong><br/>Verified &amp; Certified Correct
          </div>
        </div>
      `
    });
  });
}

function openRetroactiveDisputeDialog(container, student) {
  const existing = document.getElementById('dtr-dispute-dialog');
  if (existing) existing.remove();

  const dialog = document.createElement('dialog');
  dialog.id = 'dtr-dispute-dialog';
  dialog.setAttribute('aria-labelledby', 'dtr-dispute-title');

  dialog.innerHTML = `
    <div class="modal-header">
      <h3 id="dtr-dispute-title">Request Attendance Adjustment</h3>
      <button type="button" class="btn btn-xs btn-secondary" id="close-dispute-x" aria-label="Close">
        ${icon('x', { size: 16 })}
      </button>
    </div>
    <form method="dialog" id="dtr-dispute-form">
      <div class="modal-body">
        <p style="font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 1rem;">
          Submit an adjustment request if a shift was missed due to field work, power outage, or schedule change.
        </p>
        <div class="grid-2" style="gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label" for="disp-date">Date</label>
            <input type="date" id="disp-date" class="form-input" value="2026-10-31" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="disp-hours">Hours Requested</label>
            <input type="number" id="disp-hours" class="form-input" min="1" max="12" value="8" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="disp-reason">Reason</label>
          <textarea id="disp-reason" class="form-textarea" required placeholder="Explain why the shift log needs adjustment…"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="cancel-dispute-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">Submit Request</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialog);

  const close = () => {
    dialog.returnValue = '';
    dialog.close();
  };
  dialog.querySelector('#close-dispute-x')?.addEventListener('click', close);
  dialog.querySelector('#cancel-dispute-btn')?.addEventListener('click', close);

  dialog.querySelector('#dtr-dispute-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const targetDate = dialog.querySelector('#disp-date')?.value;
    const requestedHours = Number(dialog.querySelector('#disp-hours')?.value) || 8;
    const reason = dialog.querySelector('#disp-reason')?.value.trim();
    if (!reason) return;

    getState().dtrDisputes.unshift({
      id: `DISP-2026-${Date.now().toString().slice(-4)}`,
      studentId: student.id,
      studentName: student.name,
      college: student.college,
      company: student.company,
      targetDate,
      requestedAmIn: '08:00 AM',
      requestedAmOut: '12:00 PM',
      requestedPmIn: '01:00 PM',
      requestedPmOut: '05:00 PM',
      requestedHours,
      reason,
      attachmentName: 'Supporting_Field_Slip.pdf',
      status: 'Pending Supervisor Verification',
      supervisorRemarks: '',
      submittedAt: new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
    });

    await persistDatabase(false);
    close();
    renderStudentAttendance(container, student);
    showToast({
      title: 'Adjustment requested',
      message: `Sent ${targetDate} (${requestedHours} hrs) to your supervisor.`,
      type: 'success'
    });
  });

  dialog.addEventListener('close', () => {
    dialog.returnValue = '';
    dialog.remove();
  });
  dialog.showModal();
}

/* ==========================================================================
   5. WEEKLY TASK LOGS & NARRATIVE REPORT
   ========================================================================== */
function renderStudentTasks(container, student) {
  const logs = getScopedLogs();

  container.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${icon('fileText', { size: 18 })} Submit Weekly Task Report</h3>
            <p class="card-subtitle">Record your weekly deliverables and mapped program competency</p>
          </div>
        </div>

        <form id="weekly-task-form">
          <div class="grid-2" style="gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label" for="wk-number">Week</label>
              <select id="wk-number" class="form-select">
                <option value="7">Week 7 (Current)</option>
                <option value="6">Week 6</option>
                <option value="5">Week 5</option>
                <option value="8">Week 8</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="wk-hours">Credited Hours</label>
              <input type="number" id="wk-hours" class="form-input" value="40" min="1" max="60" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="wk-competency">Competency Outcome</label>
            <input
              type="text"
              id="wk-competency"
              class="form-input"
              value="${student.college === 'CITE' ? 'CS-PO3: Design, Implement & Evaluate Computing Systems' : 'Program Core Competency Outcome'}"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="wk-title">Accomplishment Title</label>
            <input type="text" id="wk-title" class="form-input" placeholder="e.g., Week 7: Implemented RBAC Middleware &amp; Unit Tests" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="wk-desc">Summary of Work</label>
            <textarea id="wk-desc" class="form-textarea" rows="3" placeholder="Describe the tasks completed and tools used…" required></textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%;">
            ${icon('check', { size: 15 })} Submit Weekly Report
          </button>
        </form>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${icon('bookOpen', { size: 18 })} Narrative Report</h3>
            <p class="card-subtitle">Compile your verified weekly logs into a printable terminal report</p>
          </div>
          <button type="button" class="btn btn-sm btn-secondary" id="btn-preview-narrative">
            ${icon('printer', { size: 14 })} Preview &amp; Print
          </button>
        </div>

        <div class="form-group">
          <label class="form-label" for="narrative-intro">I. Host Company &amp; Training Overview</label>
          <textarea id="narrative-intro" class="form-textarea" rows="3">Completed On-the-Job Training at ${esc(student.company || 'Partner HTE')} as ${esc(student.assignedRole || 'Student Intern')}, applying ${esc(student.program)} competencies to real-world deliverables.</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="narrative-reflection">II. Key Learnings &amp; Reflections</label>
          <textarea id="narrative-reflection" class="form-textarea" rows="4">Throughout the internship period, I strengthened my proficiency in ${(student.portfolioData?.skills || []).slice(0, 4).join(', ')} while collaborating with industry mentors.</textarea>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('clipboardCheck', { size: 18 })} Submitted Task Logs (${logs.length})</h3>
          <p class="card-subtitle">Supervisor verification and coordinator approval status</p>
        </div>
      </div>

      <div tabindex="0" role="region" aria-label="Submitted Task Logs" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Week / Date</th>
              <th>Accomplishment</th>
              <th>Competency</th>
              <th>Hours</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${logs
              .map(
                l => `
              <tr>
                <th>
                  <div>Week ${esc(String(l.weekNumber || 6))}</div>
                  <div style="font-size: 0.74rem; color: var(--text-secondary);">${esc(l.date)}</div>
                </th>
                <td data-label="Accomplishment">
                  <strong>${esc(l.title)}</strong>
                  <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem;">${esc(l.description)}</div>
                </td>
                <td data-label="Competency"><span class="badge badge-blue">${esc(l.competencyTag || 'Core Competency')}</span></td>
                <td data-label="Hours"><strong>${l.hours} hrs</strong></td>
                <td data-label="Status">${renderStatusBadge(l.status)}</td>
                <td data-label="Remarks" style="font-size: 0.78rem; color: var(--text-secondary);">${esc(l.remarks || '-')}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#weekly-task-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const weekNumber = Number(container.querySelector('#wk-number')?.value) || 7;
    const hours = Number(container.querySelector('#wk-hours')?.value) || 40;
    const competencyTag = container.querySelector('#wk-competency')?.value.trim();
    const title = container.querySelector('#wk-title')?.value.trim();
    const description = container.querySelector('#wk-desc')?.value.trim();
    if (!title || !description) return;

    getState().logs.unshift({
      id: Date.now(),
      studentId: student.id,
      student: student.name,
      college: student.college,
      company: student.company,
      date: new Date().toISOString().slice(0, 10),
      weekNumber,
      kind: 'weekly_task',
      title,
      hours,
      competencyTag,
      description,
      status: 'Pending Supervisor Verification',
      supervisorVerifiedBy: null,
      coordinatorApprovedBy: null,
      remarks: ''
    });

    await persistDatabase(false);
    renderStudentTasks(container, student);
    showToast({
      title: 'Weekly report submitted',
      message: `"${title}" sent for supervisor verification.`,
      type: 'success'
    });
  });

  container.querySelector('#btn-preview-narrative')?.addEventListener('click', () => {
    const intro = container.querySelector('#narrative-intro')?.value || '';
    const refl = container.querySelector('#narrative-reflection')?.value || '';
    openDocumentPreviewModal({
      title: `OJT Narrative Report · ${student.name}`,
      subtitle: `${student.program} (${student.college}) · Host: ${student.company}`,
      documentBodyHtml: `
        <h4 style="color: var(--nemsu-blue-900); margin-bottom: 0.4rem;">I. Host Company &amp; Training Overview</h4>
        <p style="font-size: 0.88rem; color: var(--text-primary); margin-bottom: 1rem;">${esc(intro)}</p>
        <h4 style="color: var(--nemsu-blue-900); margin-bottom: 0.4rem;">II. Key Learnings &amp; Reflections</h4>
        <p style="font-size: 0.88rem; color: var(--text-primary); margin-bottom: 1rem;">${esc(refl)}</p>
        <h4 style="color: var(--nemsu-blue-900); margin-bottom: 0.4rem;">III. Verified Weekly Accomplishments</h4>
        <ul>
          ${logs
            .map(l => `<li style="font-size: 0.84rem; margin-bottom: 0.35rem;"><strong>${esc(l.date)} (${l.hours} hrs):</strong> ${esc(l.title)} · <em>${esc(l.status)}</em></li>`)
            .join('')}
        </ul>
      `
    });
  });
}

/* ==========================================================================
   6. PLACEMENT RECOMMENDATIONS & PREFERENCE REQUEST
   ========================================================================== */
function renderStudentPlacement(container, student) {
  const state = getState();
  const stage1 = evaluateStage1Eligibility(student, null, state.collegeSettings);
  const rankings = computeSbertPlacementRankings(student, state.htes, state.collegeSettings);

  container.innerHTML = `
    <section class="eligibility-gate-banner" aria-label="Eligibility Status">
      <div class="eligibility-gate-header">
        <div>
          <div class="eligibility-gate-title">
            ${icon('shieldCheck', { size: 18 })} Eligibility Check
          </div>
          <p style="font-size: 0.8rem; color: var(--nemsu-gold-800);">
            Academic and compliance requirements checked before ranking partner companies.
          </p>
        </div>
        <span class="badge ${stage1.hardEligible ? 'badge-success' : 'badge-rule-a'}">
          ${stage1.hardEligible ? icon('check', { size: 12 }) + ' Eligible' : icon('x', { size: 12 }) + ' Hold Active'}
        </span>
      </div>

      <div class="eligibility-pills-row">
        ${Object.values(stage1.gates)
          .map(
            g => `
          <span class="badge ${g.pass ? 'badge-success' : 'badge-rule-a'}" title="${esc(g.detail)}">
            ${g.pass ? icon('check', { size: 12 }) : icon('x', { size: 12 })} ${esc(g.label)}
          </span>
        `
          )
          .join('')}
      </div>
    </section>

    <div class="card" style="border-left: 4px solid var(--nemsu-blue-700);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>
          <div style="font-size: 0.74rem; font-weight: 800; text-transform: uppercase; color: var(--text-secondary);">
            Current Placement Status
          </div>
          <div style="font-size: 1.05rem; font-weight: 800; color: var(--nemsu-blue-900); margin-top: 0.2rem;">
            ${esc(student.placementStatus || 'Unplaced')}
            ${student.preferredHte ? ` · Preferred: ${esc(student.preferredHte)}` : ''}
          </div>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.15rem;">
            Choosing a company sends a preference request to your ${esc(student.college)} Coordinator for final deployment approval.
          </p>
        </div>
        ${renderStatusBadge(student.placementStatus || 'Unplaced')}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('compass', { size: 18 })} Recommended Host Companies</h3>
          <p class="card-subtitle">
            Ranked by skill and coursework similarity (${student.portfolioData?.skills?.length || 0} skills, ${student.portfolioData?.coursework?.length || 0} courses)
          </p>
        </div>
        <a href="#/student/profile" class="btn btn-sm btn-secondary">Edit Skills</a>
      </div>

      ${
        rankings.length === 0
          ? renderEmptyState({ title: 'No partner companies found', description: 'No partner companies are listed for your college yet.' })
          : `
        <div class="sbert-cards-grid">
          ${rankings
            .map(
              rec => `
            <article class="sbert-card ${rec.rank === 1 ? 'rank-1' : ''}">
              <div>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.65rem;">
                  <span class="badge ${rec.rank === 1 ? 'badge-gold' : 'badge-blue'}">
                    #${rec.rank} · ${rec.matchPercent}% Match (${rec.cosineSimilarity.toFixed(2)})
                  </span>
                  <span class="badge ${rec.eligibility.hardEligible ? 'badge-success' : 'badge-rule-a'}">
                    ${rec.filledSlots}/${rec.maxSlots} Slots · GPA ≤ ${rec.minGpa.toFixed(2)}
                  </span>
                </div>

                <h4 style="font-size: 1.02rem; color: var(--nemsu-blue-900); margin-bottom: 0.2rem;">
                  ${esc(rec.roleTitle)}
                </h4>
                <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span style="display: inline-flex; align-items: center; gap: 0.25rem;">${icon('building', { size: 14 })} ${esc(rec.company)}</span>
                  <span>·</span>
                  <span style="display: inline-flex; align-items: center; gap: 0.25rem;">${icon('mapPin', { size: 14 })} ${esc(rec.location)}</span>
                </div>

                <p style="font-size: 0.8rem; color: var(--text-primary); background: var(--surface-subtle); padding: 0.6rem 0.75rem; border-radius: var(--radius-xs); margin-bottom: 0.75rem;">
                  ${esc(rec.reasoning)}
                </p>

                <div style="margin-bottom: 0.65rem;">
                  <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--status-success-text); margin-bottom: 0.3rem;">
                    Matched Skills (${rec.matchingSkills.length})
                  </div>
                  <div class="chip-list">
                    ${
                      rec.matchingSkills.length > 0
                        ? rec.matchingSkills.map(s => `<span class="chip matched">${icon('check', { size: 12 })} ${esc(s)}</span>`).join('')
                        : `<span style="font-size: 0.76rem; color: var(--text-muted);">No direct skill match yet</span>`
                    }
                  </div>
                </div>

                <div>
                  <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--rule-b-text); margin-bottom: 0.3rem;">
                    Skills to Develop (${rec.skillsGap.length})
                  </div>
                  <div class="chip-list">
                    ${
                      rec.skillsGap.length > 0
                        ? rec.skillsGap.map(s => `<span class="chip gap">${icon('plus', { size: 12 })} ${esc(s)}</span>`).join('')
                        : `<span class="badge badge-success">${icon('check', { size: 12 })} All required skills matched</span>`
                    }
                  </div>
                </div>
              </div>

              <div style="padding-top: 0.85rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                <span class="mono" style="font-size: 0.7rem; color: var(--text-secondary);">Cosine: ${rec.cosineSimilarity.toFixed(2)}</span>
                ${
                  student.company === rec.company && student.placementStatus === 'Approved & Deployed'
                    ? `<span class="badge badge-success">${icon('checkCircle', { size: 12 })} Assigned Host</span>`
                    : student.preferredHte === rec.company && student.placementStatus === 'Pending Coordinator Endorsement'
                    ? `<span class="badge badge-gold">${icon('clock', { size: 12 })} Preference Sent</span>`
                    : `
                  <button
                    type="button"
                    class="btn btn-sm ${rec.rank === 1 ? 'btn-primary' : 'btn-secondary'}"
                    data-request-hte="${esc(rec.company)}"
                    data-request-role="${esc(rec.roleTitle)}"
                    data-request-rank="${rec.rank}"
                    data-request-cos="${rec.cosineSimilarity.toFixed(2)}"
                    ${!rec.eligibility.hardEligible ? 'disabled' : ''}
                  >
                    Request Placement
                  </button>
                `
                }
              </div>
            </article>
          `
            )
            .join('')}
        </div>
      `
      }
    </div>
  `;

  container.querySelectorAll('[data-request-hte]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetHte = btn.getAttribute('data-request-hte');
      const targetRole = btn.getAttribute('data-request-role');
      const rank = btn.getAttribute('data-request-rank');
      const cos = btn.getAttribute('data-request-cos');

      const { confirmed } = await openConfirmModal({
        title: 'Submit placement preference?',
        message: `Send "${targetRole}" at "${targetHte}" (Rank #${rank}) to your ${student.college} Coordinator for approval?`,
        confirmText: 'Submit Preference',
        variant: 'primary'
      });

      if (!confirmed) return;

      student.preferredHte = targetHte;
      student.preferredRole = targetRole;
      if (student.placementStatus !== 'Approved & Deployed') {
        student.placementStatus = 'Pending Coordinator Endorsement';
        student.company = 'Unassigned (Pending Coordinator Approval)';
      }

      await recordAuditLog({
        actionType: 'STUDENT_PLACEMENT_PREFERENCE_SUBMITTED',
        targetStudent: `${student.name} (${student.studentNumber || student.id})`,
        summary: `Requested Rank #${rank} match: ${targetHte} (${targetRole}) with ${cos} similarity.`,
        ruleOrModelRef: `SBERT all-MiniLM-L6-v2 (${cos})`,
        originalDraft: `Top Match #${rank}: ${targetHte}`,
        finalDispatchedText: `Awaiting coordinator approval for ${targetHte}`,
        college: student.college
      });

      renderStudentPlacement(container, student);
      showToast({
        title: 'Preference submitted',
        message: `Sent ${targetHte} to your ${student.college} Coordinator.`,
        type: 'success'
      });
    });
  });
}
