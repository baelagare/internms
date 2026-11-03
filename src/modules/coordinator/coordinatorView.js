import {
  getState,
  persistDatabase,
  getActiveCollegeScope,
  getScopedStudents,
  getScopedLogs,
  getScopedDisputes,
  getScopedAlerts,
  getScopedHtes,
  getCollegeQuotaHours,
  toggleRagOfflineFallback,
  recordAuditLog,
  NEMSU_COLLEGES
} from '../../state/store.js';
import { computeSbertPlacementRankings, evaluateStage1Eligibility } from '../../services/sbertEngine.js';
import { generateRagPolicyExplanation } from '../../services/ragPolicyEngine.js';
import { showToast } from '../../components/ui/ToastManager.js';
import { openConfirmModal } from '../../components/ui/ConfirmModal.js';
import { openDrawer } from '../../components/ui/Drawer.js';
import { openDocumentPreviewModal } from '../../components/ui/PdfPreviewModal.js';
import { renderRuleBadge, renderStatusBadge } from '../../components/ui/Badge.js';
import { renderEmptyState } from '../../components/ui/EmptyState.js';
import { renderMessagesWorkspace } from '../messaging/chatView.js';
import { openEvaluationPreviewDialog } from '../student/studentView.js';
import { icon } from '../../components/ui/Icons.js';
import { esc, confirmInPlace } from '../../utils/html.js';

export function renderCoordinatorWorkspace(container, subRoute = 'dashboard') {
  const collegeScope = getActiveCollegeScope();

  if (subRoute === 'messages') {
    renderMessagesWorkspace(container);
    return;
  }
  if (subRoute === 'approvals') {
    renderCoordinatorApprovals(container, collegeScope);
    return;
  }
  if (subRoute === 'placement') {
    renderCoordinatorPlacementQueue(container, collegeScope);
    return;
  }
  if (subRoute === 'partners') {
    renderCoordinatorPartnersCrud(container, collegeScope);
    return;
  }
  if (subRoute === 'alerts') {
    renderCoordinatorAlerts(container, collegeScope);
    return;
  }
  if (subRoute === 'interns') {
    renderCoordinatorInternDirectory(container, collegeScope);
    return;
  }
  if (subRoute === 'settings') {
    renderCoordinatorThresholdSettings(container, collegeScope);
    return;
  }

  renderCoordinatorDashboard(container, collegeScope);
}

/* ==========================================================================
   1. COLLEGE COORDINATOR DASHBOARD & COMPLIANCE REPORT
   ========================================================================== */
export function renderCoordinatorDashboard(container, collegeScope) {
  const state = getState();
  const students = getScopedStudents(collegeScope);
  const alerts = getScopedAlerts(collegeScope);
  const htes = getScopedHtes(collegeScope);

  const deployedCount = students.filter(s => s.placementStatus === 'Approved & Deployed').length;
  const pendingEndorsements = students.filter(s => s.placementStatus === 'Pending Coordinator Endorsement').length;
  const fullDocsStudents = students.filter(
    s => (s.preDeploymentDocs || []).filter(d => d.status === 'Verified').length === 5
  ).length;
  const totalSlots = htes.reduce((sum, h) => sum + (Number(h.maxSlots) || 0), 0);
  const filledSlots = htes.reduce((sum, h) => sum + (Number(h.filledSlots) || 0), 0);

  container.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Intern Cohort (${esc(collegeScope)})</span>
        <div class="kpi-value">${students.length} Interns</div>
        <div class="kpi-sub">${deployedCount} deployed · ${pendingEndorsements} awaiting approval</div>
      </div>

      <div class="kpi-card gold">
        <span class="kpi-label">Checklist Complete (5/5)</span>
        <div class="kpi-value">${fullDocsStudents} / ${students.length}</div>
        <div class="kpi-sub">All 5 pre-deployment documents verified</div>
      </div>

      <div class="kpi-card success">
        <span class="kpi-label">Partner Companies</span>
        <div class="kpi-value">${htes.length} Partners</div>
        <div class="kpi-sub">${filledSlots} / ${totalSlots} slots filled</div>
      </div>

      <div class="kpi-card ${alerts.length > 0 ? 'critical' : 'purple'}">
        <span class="kpi-label">Active Risk Alerts</span>
        <div class="kpi-value">${alerts.length} Active</div>
        <div class="kpi-sub">Attendance, tasks, and document checks</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${icon('barChart', { size: 18 })} Cohort Progress (${esc(collegeScope)})</h3>
            <p class="card-subtitle">Checklist completion, logged hours, and placement status</p>
          </div>
          <button type="button" class="btn btn-sm btn-secondary" id="btn-export-compliance-report">
            ${icon('printer', { size: 14 })} Export Report
          </button>
        </div>

        <div tabindex="0" role="region" aria-label="Cohort Progress" class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Intern</th>
                <th>College / GPA</th>
                <th>Checklist</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${students
                .map(s => {
                  const vDocs = (s.preDeploymentDocs || []).filter(d => d.status === 'Verified').length;
                  const sHours = state.logs
                    .filter(l => (l.studentId === s.id || l.student === s.name) && l.status !== 'Rejected')
                    .reduce((acc, l) => acc + (Number(l.hours) || 0), 0);
                  const quota = getCollegeQuotaHours(s.college);
                  return `
                    <tr>
                      <th>
                        <div>${esc(s.name)}</div>
                        <div style="font-size: 0.72rem; color: var(--text-secondary);">${esc(s.company || 'Unassigned')}</div>
                      </th>
                      <td data-label="College / GPA">
                        <span class="badge badge-blue">${esc(s.college)}</span>
                        <span style="font-size: 0.78rem; font-weight: 700;">GPA ${Number(s.gpa || 1.75).toFixed(2)}</span>
                      </td>
                      <td data-label="Checklist">
                        <span class="badge ${vDocs === 5 ? 'badge-success' : 'badge-rule-b'}">${vDocs}/5 Verified</span>
                      </td>
                      <td data-label="Hours"><strong>${sHours} / ${quota} hrs</strong></td>
                      <td data-label="Status">${renderStatusBadge(s.placementStatus)}</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">${icon('alert', { size: 18 })} Active Risk Alerts</h3>
            <p class="card-subtitle">Interns requiring coordinator review or policy advisory</p>
          </div>
          <a href="#/${state.currentUser.role}/alerts" class="btn btn-sm btn-primary">
            Review Alerts ${icon('arrowRight', { size: 14 })}
          </a>
        </div>

        ${
          alerts.length === 0
            ? renderEmptyState({ iconName: 'checkCircle', title: 'No active risk alerts', description: 'All interns in this cohort are meeting attendance, task, and document requirements.' })
            : alerts
                .map(
                  a => `
              <div style="padding: 0.9rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); margin-bottom: 0.75rem; background: var(--surface-canvas);">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.35rem;">
                  <div>
                    <strong style="color: var(--nemsu-blue-900); font-size: 0.9rem;">${esc(a.student)}</strong>
                    <span class="badge badge-blue" style="margin-left: 0.35rem;">${esc(a.college)}</span>
                  </div>
                  ${renderRuleBadge(a.ruleId)}
                </div>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.55rem;">
                  ${(a.triggers || []).map(esc).join(' • ')}
                </p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  ${renderStatusBadge(a.hitlStatus || a.status)}
                  <a href="#/${state.currentUser.role}/alerts" class="btn btn-xs btn-secondary">Review Case</a>
                </div>
              </div>
            `
                )
                .join('')
        }
      </div>
    </div>
  `;

  container.querySelector('#btn-export-compliance-report')?.addEventListener('click', () => {
    openDocumentPreviewModal({
      title: `OJT Compliance & Placement Report (${collegeScope})`,
      subtitle: `Prepared by ${state.currentUser.name} · ${state.academicYear}`,
      documentBodyHtml: `
        <h4 style="color: var(--nemsu-blue-900); margin-bottom: 0.65rem;">I. Cohort Summary (${esc(collegeScope)})</h4>
        <p style="font-size: 0.85rem; margin-bottom: 1rem;">
          Total Interns: <strong>${students.length}</strong> · Deployed: <strong>${deployedCount}</strong> ·
          Complete Checklists (5/5): <strong>${fullDocsStudents}/${students.length}</strong> ·
          Active Risk Alerts: <strong>${alerts.length}</strong>.
        </p>
        <table class="data-table" style="border: 1px solid var(--border-strong);">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Program</th>
              <th>Host Company</th>
              <th>Checklist</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${students
              .map(s => {
                const vDocs = (s.preDeploymentDocs || []).filter(d => d.status === 'Verified').length;
                return `
                  <tr>
                    <td><strong>${esc(s.name)}</strong></td>
                    <td>${esc(s.program)}</td>
                    <td>${esc(s.company)}</td>
                    <td>${vDocs} / 5 Verified</td>
                    <td>${esc(s.placementStatus)}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      `
    });
  });
}

/* ==========================================================================
   2. APPROVALS QUEUE: PRE-DEPLOYMENT DOCS + TIME & TASK LOGS
   ========================================================================== */
let activeApprovalTab = 'docs';

export function renderCoordinatorApprovals(container, collegeScope) {
  const students = getScopedStudents(collegeScope);
  const logs = getScopedLogs(collegeScope);
  const disputes = getScopedDisputes(collegeScope);

  const docItems = [];
  for (const stu of students) {
    for (const doc of stu.preDeploymentDocs || []) {
      docItems.push({
        student: stu,
        doc
      });
    }
  }

  const pendingDocsCount = docItems.filter(i => i.doc.status !== 'Verified').length;
  const pendingLogsCount = logs.filter(l => l.status !== 'Coordinator Approved').length + disputes.length;

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('clipboardCheck', { size: 18 })} Verification Queue (${esc(collegeScope)})</h3>
          <p class="card-subtitle">Verify student pre-deployment documents and approve supervisor-checked attendance logs</p>
        </div>

        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-sm ${activeApprovalTab === 'docs' ? 'btn-primary' : 'btn-secondary'}" id="tab-queue-docs">
            ${icon('fileText', { size: 14 })} Documents (${pendingDocsCount})
          </button>
          <button type="button" class="btn btn-sm ${activeApprovalTab === 'logs' ? 'btn-primary' : 'btn-secondary'}" id="tab-queue-logs">
            ${icon('clock', { size: 14 })} Time &amp; Tasks (${pendingLogsCount})
          </button>
        </div>
      </div>

      ${
        activeApprovalTab === 'docs'
          ? `
        <div tabindex="0" role="region" aria-label="Document Verification Queue" class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Intern</th>
                <th>Document</th>
                <th>File</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${docItems
                .map(
                  ({ student, doc }) => `
                <tr>
                  <th>
                    <div>${esc(student.name)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-secondary);">${esc(student.college)} · ${esc(student.section || '')}</div>
                  </th>
                  <td data-label="Document">
                    <strong style="color: var(--nemsu-blue-900);">${esc(doc.code)}: ${esc(doc.title)}</strong>
                    <div style="font-size: 0.74rem; color: var(--text-secondary);">${esc(doc.issuer)}</div>
                  </td>
                  <td data-label="File">
                    ${
                      doc.fileName
                        ? `<span class="mono" style="font-size: 0.76rem;">${esc(doc.fileName)}</span>`
                        : `<span style="color: var(--text-muted); font-size: 0.78rem;">Not uploaded</span>`
                    }
                  </td>
                  <td data-label="Status">${renderStatusBadge(doc.status)}</td>
                  <td data-label="Remarks" style="max-width: 240px; font-size: 0.78rem; color: var(--text-secondary);">
                    ${esc(doc.remarks || '-')}
                  </td>
                  <td data-label="Actions">
                    <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                      <button type="button" class="btn btn-xs btn-secondary" data-coord-preview-doc="${student.id}:${doc.id}">
                        ${icon('eye', { size: 13 })} Preview
                      </button>
                      <button type="button" class="btn btn-xs btn-success" data-coord-verify-doc="${student.id}:${doc.id}">
                        ${icon('check', { size: 13 })} Verify
                      </button>
                      <button type="button" class="btn btn-xs btn-danger-outline" data-coord-return-doc="${student.id}:${doc.id}">
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
          : `
        ${
          disputes.length > 0
            ? `
          <div style="margin-bottom: 1.25rem; padding: 1rem; background: var(--nemsu-gold-50); border: 1px solid var(--nemsu-gold-500); border-radius: var(--radius-sm);">
            <h4 style="font-size: 0.88rem; color: var(--nemsu-blue-900); margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.4rem;">
              ${icon('clock', { size: 16 })} Attendance Adjustment Requests (${disputes.length})
            </h4>
            ${disputes
              .map(
                d => `
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; background: var(--surface-white); padding: 0.75rem 1rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); margin-bottom: 0.5rem;">
                <div>
                  <strong>${esc(d.studentName)}</strong> · <strong>${esc(d.targetDate)} (${d.requestedHours} hrs)</strong>
                  <div style="font-size: 0.8rem; color: var(--text-primary); margin-top: 0.15rem;">${esc(d.reason)}</div>
                  ${d.supervisorRemarks ? `<div style="font-size: 0.75rem; color: var(--status-success-text);">Supervisor: ${esc(d.supervisorRemarks)}</div>` : ''}
                </div>
                <div style="display: flex; gap: 0.45rem; align-items: center;">
                  ${renderStatusBadge(d.status)}
                  ${
                    d.status !== 'Coordinator Approved'
                      ? `<button type="button" class="btn btn-xs btn-success" data-approve-dispute="${d.id}">${icon('check', { size: 13 })} Approve Hours</button>`
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

        <div tabindex="0" role="region" aria-label="Time and Task Verification Queue" class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Intern</th>
                <th>Date / Week</th>
                <th>Accomplishment &amp; Competency</th>
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
                    <div style="font-size: 0.72rem; color: var(--text-secondary);">${esc(l.company || '')}</div>
                  </th>
                  <td data-label="Date">
                    <div>${esc(l.date)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-secondary);">Week ${esc(String(l.weekNumber || 6))}</div>
                  </td>
                  <td data-label="Accomplishment">
                    <strong>${esc(l.title)}</strong>
                    <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.15rem;">${esc(l.description)}</div>
                    ${l.competencyTag ? `<span class="badge badge-blue" style="margin-top: 0.25rem;">${esc(l.competencyTag)}</span>` : ''}
                  </td>
                  <td data-label="Hours"><strong>${l.hours} hrs</strong></td>
                  <td data-label="Status">
                    ${renderStatusBadge(l.status)}
                    ${l.supervisorVerifiedBy ? `<div style="font-size: 0.7rem; color: var(--status-success-text); margin-top: 0.2rem;">Verified: ${esc(l.supervisorVerifiedBy)}</div>` : ''}
                  </td>
                  <td data-label="Actions">
                    <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                      <button type="button" class="btn btn-xs btn-success" data-coord-approve-log="${l.id}">
                        ${icon('check', { size: 13 })} Approve
                      </button>
                      <button type="button" class="btn btn-xs btn-danger-outline" data-coord-reject-log="${l.id}">
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

  container.querySelector('#tab-queue-docs')?.addEventListener('click', () => {
    activeApprovalTab = 'docs';
    renderCoordinatorApprovals(container, collegeScope);
  });
  container.querySelector('#tab-queue-logs')?.addEventListener('click', () => {
    activeApprovalTab = 'logs';
    renderCoordinatorApprovals(container, collegeScope);
  });

  container.querySelectorAll('[data-coord-preview-doc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [stuId, docId] = btn.getAttribute('data-coord-preview-doc').split(':');
      const stu = students.find(s => s.id === stuId);
      const doc = stu?.preDeploymentDocs?.find(d => d.id === docId);
      if (!stu || !doc) return;
      openDocumentPreviewModal({
        title: `${doc.code}: ${doc.title}`,
        subtitle: `Submitted by ${stu.name} (${stu.college}) · Status: ${doc.status}`,
        documentBodyHtml: `
          <p style="font-size: 0.9rem; margin-bottom: 1rem;">
            <strong>Intern:</strong> ${esc(stu.name)} (${esc(stu.program)})<br/>
            <strong>Requirement:</strong> ${esc(doc.title)}<br/>
            <strong>Issued By:</strong> ${esc(doc.issuer)}<br/>
            <strong>File:</strong> <code>${esc(doc.fileName || 'Document.pdf')}</code>
          </p>
          <div style="padding: 1rem; background: var(--surface-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 0.84rem;">
            <strong>Remarks:</strong> ${esc(doc.remarks || 'No remarks recorded.')}
          </div>
        `
      });
    });
  });

  container.querySelectorAll('[data-coord-verify-doc]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const [stuId, docId] = btn.getAttribute('data-coord-verify-doc').split(':');
      const stu = students.find(s => s.id === stuId);
      const doc = stu?.preDeploymentDocs?.find(d => d.id === docId);
      if (!stu || !doc) return;

      doc.status = 'Verified';
      doc.verifiedBy = getState().currentUser?.name || 'OJT Coordinator';
      doc.remarks = `Verified by ${doc.verifiedBy}.`;

      await recordAuditLog({
        actionType: 'PRE_DEPLOYMENT_DOC_VERIFIED',
        targetStudent: stu.name,
        summary: `Verified ${doc.code} (${doc.title}).`,
        ruleOrModelRef: 'CHED CMO No. 104, s. 2017 Art. VIII Sec. 19',
        originalDraft: 'Pending Verification',
        finalDispatchedText: doc.remarks,
        college: stu.college
      });

      renderCoordinatorApprovals(container, collegeScope);
      showToast({
        title: 'Document verified',
        message: `${doc.code} for ${stu.name} marked as verified.`,
        type: 'success'
      });
    });
  });

  container.querySelectorAll('[data-coord-return-doc]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const [stuId, docId] = btn.getAttribute('data-coord-return-doc').split(':');
      const stu = students.find(s => s.id === stuId);
      const doc = stu?.preDeploymentDocs?.find(d => d.id === docId);
      if (!stu || !doc) return;

      const { confirmed, reason } = await openConfirmModal({
        title: `Return ${doc.code} for revision`,
        message: `Explain what needs to be corrected on ${stu.name}'s "${doc.title}".`,
        confirmText: 'Return Document',
        variant: 'danger',
        requireReason: true,
        reasonLabel: 'Revision notes',
        defaultReason: doc.remarks || ''
      });
      if (!confirmed) return;

      doc.status = 'Returned for Revision';
      doc.remarks = reason;

      await recordAuditLog({
        actionType: 'PRE_DEPLOYMENT_DOC_RETURNED',
        targetStudent: stu.name,
        summary: `Returned ${doc.code} (${doc.title}) for revision.`,
        ruleOrModelRef: 'Document Verification',
        originalDraft: doc.fileName || 'Uploaded File',
        finalDispatchedText: reason,
        overrideReason: reason,
        college: stu.college
      });

      renderCoordinatorApprovals(container, collegeScope);
      showToast({
        title: 'Document returned',
        message: `Revision notes sent to ${stu.name}.`,
        type: 'warning'
      });
    });
  });

  container.querySelectorAll('[data-approve-dispute]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const dispId = btn.getAttribute('data-approve-dispute');
      const disp = getState().dtrDisputes.find(d => d.id === dispId);
      if (!disp) return;

      disp.status = 'Coordinator Approved';
      getState().logs.unshift({
        id: Date.now(),
        studentId: disp.studentId,
        student: disp.studentName,
        college: disp.college,
        company: disp.company,
        date: disp.targetDate,
        weekNumber: 6,
        kind: 'attendance',
        amIn: disp.requestedAmIn,
        amOut: disp.requestedAmOut,
        pmIn: disp.requestedPmIn,
        pmOut: disp.requestedPmOut,
        hours: disp.requestedHours,
        title: `Approved Attendance Adjustment (${disp.id})`,
        description: disp.reason,
        status: 'Coordinator Approved',
        supervisorVerifiedBy: 'HTE Supervisor',
        coordinatorApprovedBy: getState().currentUser?.name
      });

      await persistDatabase(false);
      renderCoordinatorApprovals(container, collegeScope);
      showToast({
        title: 'Adjustment approved',
        message: `${disp.requestedHours} hrs credited to ${disp.studentName}.`,
        type: 'success'
      });
    });
  });

  container.querySelectorAll('[data-coord-approve-log]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const logId = Number(btn.getAttribute('data-coord-approve-log'));
      const log = getState().logs.find(l => l.id === logId);
      if (!log) return;
      log.status = 'Coordinator Approved';
      log.coordinatorApprovedBy = getState().currentUser?.name || 'OJT Coordinator';
      log.remarks = 'Approved and credited toward training hours.';
      await persistDatabase(false);
      renderCoordinatorApprovals(container, collegeScope);
      showToast({ title: 'Log approved', message: `Credited ${log.hours} hrs for ${log.student}.`, type: 'success' });
    });
  });

  container.querySelectorAll('[data-coord-reject-log]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const logId = Number(btn.getAttribute('data-coord-reject-log'));
      const log = getState().logs.find(l => l.id === logId);
      if (!log) return;

      const { confirmed, reason } = await openConfirmModal({
        title: 'Return log entry',
        message: `Enter revision instructions for ${log.student}'s log "${log.title}".`,
        confirmText: 'Return Log',
        variant: 'danger',
        requireReason: true,
        reasonLabel: 'Revision instructions'
      });
      if (!confirmed) return;

      log.status = 'Returned for Revision';
      log.remarks = reason;
      await persistDatabase(false);
      renderCoordinatorApprovals(container, collegeScope);
      showToast({ title: 'Log returned', message: `Revision notes sent to ${log.student}.`, type: 'warning' });
    });
  });
}

/* ==========================================================================
   3. PLACEMENT APPROVALS & OVERRIDES
   ========================================================================== */
export function renderCoordinatorPlacementQueue(container, collegeScope) {
  const state = getState();
  const students = getScopedStudents(collegeScope);

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('compass', { size: 18 })} Placement Approvals (${esc(collegeScope)})</h3>
          <p class="card-subtitle">Compare student preferences against top-ranked company matches and approve deployment</p>
        </div>
      </div>

      <div tabindex="0" role="region" aria-label="Placement Queue" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Intern &amp; GPA</th>
              <th>Eligibility</th>
              <th>Student Preference</th>
              <th>Top Match</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${students
              .map(stu => {
                const stage1 = evaluateStage1Eligibility(stu, null, state.collegeSettings);
                const rankings = computeSbertPlacementRankings(stu, state.htes, state.collegeSettings);
                const top = rankings[0];
                return `
                  <tr>
                    <th>
                      <div>${esc(stu.name)}</div>
                      <div style="font-size: 0.74rem; color: var(--text-secondary);">${esc(stu.program)} · GPA <strong>${Number(stu.gpa || 1.75).toFixed(2)}</strong></div>
                    </th>
                    <td data-label="Eligibility">
                      <span class="badge ${stage1.hardEligible ? 'badge-success' : 'badge-rule-a'}">
                        ${stage1.hardEligible ? icon('check', { size: 12 }) + ' Eligible' : icon('x', { size: 12 }) + ' Hold'}
                      </span>
                      <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.2rem;">
                        ${esc(stage1.gates.preDeploymentDocs.label)}
                      </div>
                    </td>
                    <td data-label="Preference">
                      <strong>${esc(stu.preferredHte || 'No preference set')}</strong>
                      <div style="font-size: 0.72rem; color: var(--text-secondary);">${esc(stu.preferredRole || '')}</div>
                    </td>
                    <td data-label="Top Match">
                      ${
                        top
                          ? `
                        <div><strong>${esc(top.company)}</strong></div>
                        <span class="badge badge-gold">${top.matchPercent}% Match (${top.cosineSimilarity.toFixed(2)})</span>
                      `
                          : '-'
                      }
                    </td>
                    <td data-label="Status">${renderStatusBadge(stu.placementStatus)}</td>
                    <td data-label="Actions">
                      <button type="button" class="btn btn-xs btn-primary" data-inspect-placement="${stu.id}">
                        Review Matches
                      </button>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-inspect-placement]').forEach(btn => {
    btn.addEventListener('click', () => {
      const stuId = btn.getAttribute('data-inspect-placement');
      const stu = students.find(s => s.id === stuId);
      if (stu) openCoordinatorPlacementDrawer(container, stu, collegeScope);
    });
  });
}

function openCoordinatorPlacementDrawer(container, student, collegeScope) {
  const state = getState();
  const stage1 = evaluateStage1Eligibility(student, null, state.collegeSettings);
  const rankings = computeSbertPlacementRankings(student, state.htes, state.collegeSettings);

  const contentHtml = `
    <div style="background: var(--nemsu-gold-50); border: 1px solid var(--nemsu-gold-500); border-radius: var(--radius-sm); padding: 0.9rem; margin-bottom: 1.15rem;">
      <div style="font-weight: 800; color: var(--nemsu-blue-900); font-size: 0.88rem; margin-bottom: 0.45rem;">
        Eligibility Summary · GPA ${Number(student.gpa || 1.75).toFixed(2)}
      </div>
      <div class="chip-list">
        ${Object.values(stage1.gates)
          .map(
            g => `<span class="badge ${g.pass ? 'badge-success' : 'badge-rule-a'}">${g.pass ? icon('check', { size: 12 }) : icon('x', { size: 12 })} ${esc(g.label)}</span>`
          )
          .join('')}
      </div>
    </div>

    <h4 style="font-size: 0.9rem; color: var(--nemsu-blue-900); margin-bottom: 0.75rem;">
      Ranked Company Matches (${rankings.length})
    </h4>

    ${rankings
      .map(
        rec => `
      <div style="border: 1px solid ${rec.rank === 1 ? 'var(--nemsu-gold-500)' : 'var(--border-subtle)'}; border-radius: var(--radius-sm); padding: 1rem; margin-bottom: 0.85rem; background: var(--surface-white);">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
          <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
            <span class="badge ${rec.rank === 1 ? 'badge-gold' : 'badge-blue'}">#${rec.rank} · ${rec.matchPercent}% (${rec.cosineSimilarity.toFixed(2)})</span>
            ${student.preferredHte === rec.company ? `<span class="badge badge-success">${icon('check', { size: 11 })} Student Choice</span>` : ''}
          </div>
          <span class="badge badge-neutral">Slots: ${rec.filledSlots}/${rec.maxSlots}</span>
        </div>

        <strong style="font-size: 0.95rem; color: var(--nemsu-blue-900); display: block;">${esc(rec.roleTitle)} · ${esc(rec.company)}</strong>
        <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0.35rem 0;">${esc(rec.reasoning)}</p>

        <div style="margin-bottom: 0.4rem;">
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--status-success-text);">Matched:</span>
          ${rec.matchingSkills.map(s => `<span class="chip matched" style="font-size: 0.7rem;">${esc(s)}</span>`).join(' ') || '<span style="font-size: 0.72rem;">None</span>'}
        </div>

        <div style="margin-bottom: 0.75rem;">
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--rule-b-text);">Gaps:</span>
          ${rec.skillsGap.map(s => `<span class="chip gap" style="font-size: 0.7rem;">${esc(s)}</span>`).join(' ') || '<span style="font-size: 0.72rem;">None</span>'}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
          ${
            rec.rank === 1 || student.preferredHte === rec.company
              ? `
            <button type="button" class="btn btn-xs btn-success" data-endorse-hte="${esc(rec.company)}" data-endorse-role="${esc(rec.roleTitle)}" data-endorse-rank="${rec.rank}" data-endorse-cos="${rec.cosineSimilarity.toFixed(2)}">
              ${icon('check', { size: 13 })} Approve Deployment
            </button>
          `
              : `
            <button type="button" class="btn btn-xs btn-secondary" data-override-hte="${esc(rec.company)}" data-override-role="${esc(rec.roleTitle)}" data-override-rank="${rec.rank}" data-override-cos="${rec.cosineSimilarity.toFixed(2)}">
              Assign #${rec.rank} (Override)
            </button>
          `
          }
        </div>
      </div>
    `
      )
      .join('')}
  `;

  openDrawer({
    title: `Placement Review · ${student.name}`,
    subtitle: `${student.program} (${student.college})`,
    contentHtml,
    onMount: (drawerEl, closeDrawer) => {
      drawerEl.querySelectorAll('[data-endorse-hte]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const company = btn.getAttribute('data-endorse-hte');
          const role = btn.getAttribute('data-endorse-role');
          const rank = btn.getAttribute('data-endorse-rank');
          const cos = btn.getAttribute('data-endorse-cos');

          student.company = company;
          student.assignedRole = role;
          student.placementStatus = 'Approved & Deployed';
          student.deploymentStartDate = student.deploymentStartDate || '2026-09-15';

          const hteObj = state.htes.find(h => h.name === company);
          if (hteObj && hteObj.filledSlots < hteObj.maxSlots) {
            hteObj.filledSlots += 1;
          }

          await recordAuditLog({
            actionType: 'PLACEMENT_HITL_ENDORSEMENT',
            targetStudent: `${student.name} (${student.studentNumber || student.id})`,
            summary: `Approved Rank #${rank} placement at ${company} (${role}).`,
            ruleOrModelRef: `SBERT all-MiniLM-L6-v2 (${cos})`,
            originalDraft: `Recommended Rank #${rank}: ${company}`,
            finalDispatchedText: `Approved deployment to ${company} (${role}).`,
            college: student.college
          });

          closeDrawer();
          renderCoordinatorPlacementQueue(container, collegeScope);
          showToast({
            title: 'Placement approved',
            message: `${student.name} deployed to ${company}.`,
            type: 'success'
          });
        });
      });

      drawerEl.querySelectorAll('[data-override-hte]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const company = btn.getAttribute('data-override-hte');
          const role = btn.getAttribute('data-override-role');
          const rank = btn.getAttribute('data-override-rank');
          const cos = btn.getAttribute('data-override-cos');

          const { confirmed, reason } = await openConfirmModal({
            title: `Assign ${company} (Rank #${rank})?`,
            message: `Provide a brief reason for assigning Rank #${rank} instead of the top match.`,
            confirmText: 'Confirm Assignment',
            variant: 'primary',
            requireReason: true,
            reasonLabel: 'Reason for override'
          });

          if (!confirmed) return;

          student.company = company;
          student.assignedRole = role;
          student.placementStatus = 'Approved & Deployed';
          student.deploymentStartDate = student.deploymentStartDate || '2026-09-15';

          await recordAuditLog({
            actionType: 'PLACEMENT_HITL_OVERRIDE',
            targetStudent: `${student.name} (${student.studentNumber || student.id})`,
            summary: `Assigned Rank #${rank} (${company} · ${role}) with coordinator justification.`,
            ruleOrModelRef: `SBERT all-MiniLM-L6-v2 (${cos})`,
            originalDraft: `Top Match: ${rankings[0]?.company || 'N/A'}`,
            finalDispatchedText: `Assigned to ${company} (${role}).`,
            overrideReason: reason,
            college: student.college
          });

          closeDrawer();
          renderCoordinatorPlacementQueue(container, collegeScope);
          showToast({
            title: 'Placement assigned',
            message: `Assigned ${student.name} to ${company}.`,
            type: 'success'
          });
        });
      });
    }
  });
}

/* ==========================================================================
   4. PARTNER COMPANIES & JOB POSTINGS
   ========================================================================== */
export function renderCoordinatorPartnersCrud(container, collegeScope) {
  const htes = getScopedHtes(collegeScope);

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('building', { size: 18 })} Partner Companies (${esc(collegeScope)})</h3>
          <p class="card-subtitle">Manage host training establishments, role requirements, slot capacities, and supervisor tokens</p>
        </div>
        <button type="button" class="btn btn-sm btn-primary" id="btn-add-new-hte">
          ${icon('plus', { size: 14 })} Add Partner
        </button>
      </div>

      <div tabindex="0" role="region" aria-label="Partner Companies" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Company &amp; Role</th>
              <th>College / GPA</th>
              <th>Required Skills</th>
              <th>Slots</th>
              <th>Invite Token</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${htes
              .map(
                h => `
              <tr>
                <th>
                  <div>${esc(h.name)}</div>
                  <div style="font-size: 0.76rem; color: var(--nemsu-blue-700);">${esc(h.roleTitle)}</div>
                  <div style="font-size: 0.72rem; color: var(--text-secondary);">${esc(h.location)} · ${esc(h.supervisorName)}</div>
                </th>
                <td data-label="College / GPA">
                  <span class="badge badge-blue">${esc(h.college)}</span>
                  <div style="font-size: 0.75rem; margin-top: 0.2rem;">GPA ≤ ${Number(h.minGpa || 2.5).toFixed(2)}</div>
                </td>
                <td data-label="Required Skills" style="max-width: 300px;">
                  <div class="chip-list">
                    ${(h.requiredSkills || []).map(s => `<span class="chip" style="font-size: 0.7rem;">${esc(s)}</span>`).join('')}
                  </div>
                </td>
                <td data-label="Slots">
                  <span class="badge ${h.filledSlots < h.maxSlots ? 'badge-success' : 'badge-rule-a'}">
                    ${h.filledSlots} / ${h.maxSlots} Filled
                  </span>
                </td>
                <td data-label="Invite Token">
                  <code style="background: var(--nemsu-gold-50); color: var(--nemsu-gold-800); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid var(--nemsu-gold-500); font-weight: 700;">
                    ${esc(h.inviteToken || 'HTE-2026')}
                  </code>
                </td>
                <td data-label="Actions">
                  <button type="button" class="btn btn-xs btn-secondary" data-edit-hte="${h.id}">
                    ${icon('edit', { size: 13 })} Edit
                  </button>
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

  container.querySelector('#btn-add-new-hte')?.addEventListener('click', () => {
    openHteFormModal(container, null, collegeScope);
  });

  container.querySelectorAll('[data-edit-hte]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hteId = btn.getAttribute('data-edit-hte');
      const hte = getState().htes.find(h => h.id === hteId);
      if (hte) openHteFormModal(container, hte, collegeScope);
    });
  });
}

export function openHteFormModal(container, existingHte = null, collegeScope = 'CITE') {
  const defaultCol = existingHte?.college || (collegeScope === 'ALL' ? 'CITE' : collegeScope);
  const contentHtml = `
    <form id="hte-crud-form">
      <div class="grid-2" style="gap: 0.75rem;">
        <div class="form-group">
          <label class="form-label" for="hte-f-name">Company Name</label>
          <input type="text" id="hte-f-name" class="form-input" value="${esc(existingHte?.name || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="hte-f-role">Role Title</label>
          <input type="text" id="hte-f-role" class="form-input" value="${esc(existingHte?.roleTitle || '')}" required />
        </div>
      </div>

      <div class="grid-3" style="gap: 0.75rem;">
        <div class="form-group">
          <label class="form-label" for="hte-f-college">College</label>
          <select id="hte-f-college" class="form-select">
            ${Object.keys(NEMSU_COLLEGES)
              .map(c => `<option value="${c}" ${defaultCol === c ? 'selected' : ''}>${c}</option>`)
              .join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="hte-f-slots">Max Slots</label>
          <input type="number" id="hte-f-slots" class="form-input" min="1" max="50" value="${existingHte?.maxSlots || 5}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="hte-f-gpa">GPA Cutoff</label>
          <input type="number" id="hte-f-gpa" class="form-input" step="0.05" min="1.0" max="3.0" value="${existingHte?.minGpa || 2.25}" required />
        </div>
      </div>

      <div class="grid-2" style="gap: 0.75rem;">
        <div class="form-group">
          <label class="form-label" for="hte-f-sup">Supervisor Name</label>
          <input type="text" id="hte-f-sup" class="form-input" value="${esc(existingHte?.supervisorName || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="hte-f-token">Supervisor Invite Token</label>
          <input type="text" id="hte-f-token" class="form-input mono" value="${esc(existingHte?.inviteToken || `HTE-${defaultCol}-${Math.floor(1000 + Math.random() * 9000)}`)}" required />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="hte-f-desc">Role Description</label>
        <textarea id="hte-f-desc" class="form-textarea" rows="3" required>${esc(existingHte?.description || '')}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label" for="hte-f-skills">Required Skills (Comma-separated)</label>
        <input type="text" id="hte-f-skills" class="form-input" value="${esc((existingHte?.requiredSkills || []).join(', '))}" required />
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
        <button type="submit" class="btn btn-primary">${existingHte ? 'Save Changes' : 'Add Partner'}</button>
      </div>
    </form>
  `;

  openDrawer({
    title: existingHte ? `Edit Partner · ${existingHte.name}` : 'Add Partner Company',
    contentHtml,
    onMount: (drawerEl, closeDrawer) => {
      drawerEl.querySelector('#hte-crud-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const name = drawerEl.querySelector('#hte-f-name')?.value.trim();
        const roleTitle = drawerEl.querySelector('#hte-f-role')?.value.trim();
        const college = drawerEl.querySelector('#hte-f-college')?.value;
        const maxSlots = Number(drawerEl.querySelector('#hte-f-slots')?.value) || 5;
        const minGpa = Number(drawerEl.querySelector('#hte-f-gpa')?.value) || 2.25;
        const supervisorName = drawerEl.querySelector('#hte-f-sup')?.value.trim();
        const inviteToken = drawerEl.querySelector('#hte-f-token')?.value.trim().toUpperCase();
        const description = drawerEl.querySelector('#hte-f-desc')?.value.trim();
        const requiredSkills = (drawerEl.querySelector('#hte-f-skills')?.value || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        if (existingHte) {
          Object.assign(existingHte, {
            name,
            roleTitle,
            college,
            maxSlots,
            minGpa,
            supervisorName,
            inviteToken,
            description,
            requiredSkills
          });
        } else {
          getState().htes.unshift({
            id: `hte-${Date.now()}`,
            name,
            roleTitle,
            college,
            targetPrograms: NEMSU_COLLEGES[college]?.programs || [],
            location: 'Tandag City, Surigao del Sur',
            supervisorName,
            supervisorEmail: 'partner@hte.ph',
            inviteToken,
            maxSlots,
            filledSlots: 0,
            minGpa,
            description,
            requiredSkills,
            requiredCoursework: NEMSU_COLLEGES[college]?.defaultCoursework?.slice(0, 2) || []
          });
        }

        await persistDatabase(false);
        closeDrawer();
        renderCoordinatorPartnersCrud(container, collegeScope);
        showToast({
          title: existingHte ? 'Partner updated' : 'Partner added',
          message: `${name} saved.`,
          type: 'success'
        });
      });
    }
  });
}

/* ==========================================================================
   5. RISK ALERTS & 3-PANEL REVIEW MODAL
   ========================================================================== */
export function renderCoordinatorAlerts(container, collegeScope) {
  const state = getState();
  const alerts = getScopedAlerts(collegeScope);

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('alert', { size: 18 })} Early-Warning Risk Alerts (${esc(collegeScope)})</h3>
          <p class="card-subtitle">
            Review attendance, task alignment, and document alerts with cited policy clauses before sending advisories
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <button type="button" class="btn btn-xs ${state.ragOfflineFallback ? 'btn-gold' : 'btn-secondary'}" id="btn-toggle-rag-fallback">
            ${icon('cpu', { size: 13 })} ${state.ragOfflineFallback ? 'Template Mode Active' : 'Cloud AI Mode Active'}
          </button>
        </div>
      </div>

      ${
        alerts.length === 0
          ? renderEmptyState({ iconName: 'shieldCheck', title: 'No active risk alerts', description: 'No interns in this college scope have triggered risk alerts.' })
          : `
        <div tabindex="0" role="region" aria-label="Risk Alerts Table" class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Intern &amp; Host</th>
                <th>Risk Type</th>
                <th>Triggers</th>
                <th>Policy References</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${alerts
                .map(
                  alert => `
                <tr>
                  <th>
                    <div>${esc(alert.student)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-secondary);">${esc(alert.college)} · ${esc(alert.company)}</div>
                  </th>
                  <td data-label="Risk Type">
                    ${renderRuleBadge(alert.ruleId)}
                  </td>
                  <td data-label="Triggers">
                    ${(alert.triggers || []).map(t => `<div style="font-size: 0.78rem; font-weight: 600;">• ${esc(t)}</div>`).join('')}
                  </td>
                  <td data-label="Policy References">
                    ${(alert.retrievedClauseIds || [])
                      .map(id => `<span class="badge badge-blue" style="margin: 0.1rem;">${esc(id)}</span>`)
                      .join('')}
                  </td>
                  <td data-label="Status">
                    ${renderStatusBadge(alert.hitlStatus || alert.status)}
                  </td>
                  <td data-label="Actions">
                    <button type="button" class="btn btn-sm btn-primary" data-open-hitl-modal="${alert.id}">
                      Review &amp; Respond
                    </button>
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

  container.querySelector('#btn-toggle-rag-fallback')?.addEventListener('click', () => {
    toggleRagOfflineFallback();
    renderCoordinatorAlerts(container, collegeScope);
    showToast({
      title: getState().ragOfflineFallback ? 'Template mode enabled' : 'Cloud AI mode enabled',
      message: getState().ragOfflineFallback
        ? 'Using local policy templates while external AI is offline.'
        : 'Restored Cloud Gemma 2B policy synthesis.',
      type: 'info'
    });
  });

  container.querySelectorAll('[data-open-hitl-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const alertId = Number(btn.getAttribute('data-open-hitl-modal'));
      const alertObj = getState().alerts.find(a => a.id === alertId);
      if (alertObj) openThreePanelHitlGovernanceModal(container, alertObj, collegeScope);
    });
  });
}

function openThreePanelHitlGovernanceModal(container, alert, collegeScope) {
  const state = getState();
  const ragResult = generateRagPolicyExplanation(alert, state.policyCorpus, state.ragOfflineFallback);
  const ev = alert.evidence || {};

  const existing = document.getElementById('hitl-governance-dialog');
  if (existing) existing.remove();

  const dialog = document.createElement('dialog');
  dialog.id = 'hitl-governance-dialog';
  dialog.className = 'hitl-modal-xl';
  dialog.setAttribute('aria-labelledby', 'hitl-modal-title');

  let ruleEvidenceHtml = '';
  if (alert.ruleId === 'RULE_A_ATTENDANCE') {
    ruleEvidenceHtml = `
      <div style="background: var(--rule-a-bg); border: 1px solid var(--rule-a-border); border-radius: var(--radius-xs); padding: 0.75rem;">
        <strong style="color: var(--rule-a-text); font-size: 0.84rem;">Unexcused Absences</strong>
        <div style="font-size: 0.8rem; margin-top: 0.25rem;">
          Recorded: <strong>${ev.consecutiveAbsences || 4} days</strong> (Limit: ${ev.thresholdAbsences || 3} days)
        </div>
        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">
          Dates: ${(ev.absenceDates || []).map(esc).join(', ')}
        </div>
      </div>
      <div style="background: var(--rule-a-bg); border: 1px solid var(--rule-a-border); border-radius: var(--radius-xs); padding: 0.75rem;">
        <strong style="color: var(--rule-a-text); font-size: 0.84rem;">Hours Deficit</strong>
        <div style="font-size: 0.8rem; margin-top: 0.25rem;">
          Logged: <strong>${ev.loggedHours || 132} hrs</strong> · Expected: <strong>${ev.expectedHoursByWeek6 || 162} hrs</strong>
        </div>
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--rule-a-text); margin-top: 0.2rem;">
          Deficit: ${ev.deficitPct || 18.5}% (Limit: ${ev.thresholdDeficitPct || 15.0}%)
        </div>
      </div>
    `;
  } else if (alert.ruleId === 'RULE_B_MISALIGNMENT') {
    ruleEvidenceHtml = `
      <div style="background: var(--rule-b-bg); border: 1px solid var(--rule-b-border); border-radius: var(--radius-xs); padding: 0.75rem;">
        <strong style="color: var(--rule-b-text); font-size: 0.84rem;">Flagged Weeks: ${ev.consecutiveWeeksFlagged || 3} consecutive weeks</strong>
        <div style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 0.2rem;">
          College limit: ${ev.thresholdWeeks || 3} consecutive weeks
        </div>
      </div>
      ${(ev.flaggedLogs || [])
        .map(
          fl => `
        <div style="background: var(--surface-white); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); padding: 0.65rem;">
          <strong style="font-size: 0.8rem; color: var(--nemsu-blue-900);">${esc(fl.week)}: ${esc(fl.title)}</strong>
          <div style="margin-top: 0.3rem;" class="chip-list">
            ${(fl.matchedKeywords || []).map(kw => `<span class="chip gap" style="font-size: 0.7rem;">"${esc(kw)}"</span>`).join('')}
          </div>
        </div>
      `
        )
        .join('')}
    `;
  } else {
    ruleEvidenceHtml = `
      <div style="background: var(--rule-c-bg); border: 1px solid var(--rule-c-border); border-radius: var(--radius-xs); padding: 0.75rem;">
        <strong style="color: var(--rule-c-text); font-size: 0.84rem;">Unverified Documents Past Start Date</strong>
        <div style="font-size: 0.8rem; margin-top: 0.25rem;">
          Start Date: <strong>${esc(ev.deploymentStartDate || '2026-09-15')}</strong> (${ev.daysPastDeployment || 42} days elapsed)
        </div>
        <div style="font-size: 0.8rem; margin-top: 0.15rem;">
          Verified: <strong>${ev.verifiedCount ?? 3} / ${ev.requiredCount ?? 5}</strong>
        </div>
      </div>
      ${(ev.missingDocs || [])
        .map(
          md => `
        <div style="background: var(--surface-white); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); padding: 0.65rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 0.8rem; color: var(--nemsu-blue-900);">${esc(md.code)}: ${esc(md.title)}</strong>
          </div>
          ${renderStatusBadge(md.status)}
        </div>
      `
        )
        .join('')}
    `;
  }

  dialog.innerHTML = `
    <div class="modal-header">
      <div>
        <h3 id="hitl-modal-title">Case Review &amp; Intervention · ${esc(alert.student)}</h3>
        <div style="font-size: 0.76rem; color: var(--nemsu-gold-400); margin-top: 0.15rem;">
          ${esc(alert.college)} · ${esc(alert.program)} · Host: ${esc(alert.company)}
        </div>
      </div>
      <button type="button" class="btn btn-xs btn-secondary" id="hitl-close-x" aria-label="Close">
        ${icon('x', { size: 16 })}
      </button>
    </div>

    <div class="modal-body">
      ${
        ragResult.mode === 'DETERMINISTIC_FALLBACK'
          ? `
        <div style="background: var(--nemsu-gold-50); border: 1px solid var(--nemsu-gold-500); border-left: 4px solid var(--rule-b-text); padding: 0.65rem 0.9rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.8rem; color: var(--nemsu-gold-800);">
          <strong>Offline Template Mode:</strong> Displaying standard policy guidance while external AI synthesis is offline.
        </div>
      `
          : ''
      }

      <div class="hitl-three-panel">
        <!-- PANEL 1: EVIDENCE -->
        <section class="hitl-panel" aria-label="Evidence">
          <div class="hitl-panel-title">
            <span>1. Triggered Evidence</span>
            ${renderRuleBadge(alert.ruleId)}
          </div>

          ${ruleEvidenceHtml}

          <div style="margin-top: auto; padding-top: 0.75rem; border-top: 1px dashed var(--border-strong); font-size: 0.74rem; color: var(--text-secondary);">
            Logged: <strong>${esc(alert.triggeredAt || '2026-10-28 08:00 AM')}</strong>
          </div>
        </section>

        <!-- PANEL 2: POLICY & EXPLANATION -->
        <section class="hitl-panel" aria-label="Policy References and Explanation">
          <div class="hitl-panel-title">
            <span>2. Policy &amp; Explanation</span>
            <span class="badge badge-gold">${ragResult.retrievedClauses.length} Clauses</span>
          </div>

          <div>
            ${ragResult.retrievedClauses
              .map(
                c => `
              <div style="background: var(--surface-white); border: 1px solid var(--border-subtle); border-left: 3px solid var(--nemsu-blue-700); border-radius: var(--radius-xs); padding: 0.65rem; margin-bottom: 0.5rem;">
                <div style="display: flex; justify-content: space-between; gap: 0.4rem; font-size: 0.74rem; font-weight: 800; color: var(--nemsu-blue-900);">
                  <span>${esc(c.sourceDoc)}</span>
                  <span class="mono">${esc(c.chunkId)}</span>
                </div>
                <div style="font-size: 0.73rem; font-weight: 700; color: var(--nemsu-gold-800); margin-top: 0.1rem;">
                  ${esc(c.sectionRef)} · ${esc(c.title)}
                </div>
                <p style="font-size: 0.76rem; color: var(--text-primary); margin-top: 0.3rem; line-height: 1.45;">
                  "${esc(c.verbatimText)}"
                </p>
              </div>
            `
              )
              .join('')}
          </div>

          <div style="background: var(--nemsu-blue-50); border: 1px solid var(--nemsu-blue-100); border-radius: var(--radius-xs); padding: 0.75rem;">
            <div style="font-size: 0.73rem; font-weight: 800; color: var(--nemsu-blue-900); margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.35rem;">
              ${icon('cpu', { size: 14 })} ${esc(ragResult.modelBadge)}
            </div>
            <p style="font-size: 0.79rem; color: var(--text-primary); line-height: 1.5;">
              ${esc(ragResult.synthesisText)}
            </p>
          </div>

          <details class="progressive-details">
            <summary>${icon('lock', { size: 13 })} View anonymized outbound payload (RA 10173)</summary>
            <div style="margin-top: 0.5rem;">
              <div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 0.35rem;">
                Excluded fields: <code>student_name</code>, <code>student_id</code>, <code>email</code>, <code>raw_diary_text</code>.
              </div>
              <pre style="background: #0F172A; color: #A7F3D0; padding: 0.65rem; border-radius: 6px; font-size: 0.7rem; overflow-x: auto; max-height: 160px;">${esc(JSON.stringify(ragResult.outboundPayload, null, 2))}</pre>
            </div>
          </details>
        </section>

        <!-- PANEL 3: COORDINATOR DECISION -->
        <section class="hitl-panel" aria-label="Coordinator Decision">
          <div class="hitl-panel-title">
            <span>3. Coordinator Decision</span>
            <span class="badge badge-success">Coordinator Control</span>
          </div>

          <div class="form-group" style="margin-bottom: 0.5rem;">
            <label class="form-label" for="hitl-stage-select">Intervention Level</label>
            <select id="hitl-stage-select" class="form-select">
              <option value="warning_1" ${alert.warningStage === 'warning_1' ? 'selected' : ''}>1st Notice · Advisory &amp; Compliance Window</option>
              <option value="warning_2" ${alert.warningStage === 'warning_2' ? 'selected' : ''}>2nd Notice · Coordinator &amp; Supervisor Conference</option>
              <option value="warning_3" ${alert.warningStage === 'warning_3' ? 'selected' : ''}>3rd Notice · Realignment Review</option>
            </select>
          </div>

          <div class="form-group" style="flex: 1; display: flex; flex-direction: column;">
            <label class="form-label" for="hitl-draft-textarea">Advisory Message (Editable)</label>
            <textarea id="hitl-draft-textarea" class="form-textarea" style="flex: 1; min-height: 165px;">${esc(alert.draftMessage || ragResult.synthesisText)}</textarea>
          </div>

          <div id="hitl-override-box" hidden style="background: var(--rule-c-bg); border: 1px solid var(--rule-c-border); border-radius: var(--radius-xs); padding: 0.75rem;">
            <label class="form-label" for="hitl-override-reason" style="color: var(--rule-c-text);">
              Reason for dismissing alert *
            </label>
            <textarea id="hitl-override-reason" class="form-textarea" rows="2" placeholder="e.g., Excused medical absence on file…"></textarea>
            <div style="display: flex; justify-content: flex-end; gap: 0.45rem; margin-top: 0.5rem;">
              <button type="button" class="btn btn-xs btn-secondary" id="btn-cancel-override">Cancel</button>
              <button type="button" class="btn btn-xs btn-danger" id="btn-confirm-dismiss-flag">Confirm Dismissal</button>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: auto;">
            <button type="button" class="btn btn-success" id="btn-hitl-approve-dispatch">
              ${icon('check', { size: 15 })} Approve &amp; Send Advisory
            </button>
            <button type="button" class="btn btn-primary" id="btn-hitl-edit-dispatch">
              ${icon('send', { size: 15 })} Save Edits &amp; Send
            </button>
            <button type="button" class="btn btn-danger-outline" id="btn-hitl-show-override">
              Dismiss Alert
            </button>
          </div>
        </section>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  const close = () => {
    dialog.returnValue = '';
    dialog.close();
  };
  dialog.querySelector('#hitl-close-x')?.addEventListener('click', close);

  const dispatchIntervention = async isEdited => {
    const draftTextarea = dialog.querySelector('#hitl-draft-textarea');
    const stageSelect = dialog.querySelector('#hitl-stage-select');
    const finalMessage = draftTextarea?.value.trim() || '';
    const selectedStage = stageSelect?.value || 'warning_1';
    if (!finalMessage) return;

    const originalDraft = alert.draftMessage || ragResult.synthesisText;
    alert.draftMessage = finalMessage;
    alert.warningStage = selectedStage;
    alert.hitlStatus = isEdited ? 'Edited & Dispatched by Coordinator' : 'Approved & Dispatched by Coordinator';
    alert.status = alert.hitlStatus;

    state.messages.push({
      id: Date.now(),
      senderId: state.currentUser?.id || '1234',
      senderName: state.currentUser?.name || 'OJT Coordinator',
      senderRole: state.currentUser?.role || 'coordinator',
      recipientId: alert.studentId || 'student',
      text: finalMessage,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    });

    await recordAuditLog({
      actionType: isEdited ? 'EARLY_WARNING_EDITED_AND_DISPATCHED' : 'EARLY_WARNING_APPROVED_AND_DISPATCHED',
      targetStudent: `${alert.student} (${alert.studentNumber || alert.studentId})`,
      summary: `${isEdited ? 'Edited and sent' : 'Approved and sent'} ${alert.ruleLabel} advisory.`,
      ruleOrModelRef: `${alert.ruleCode} + ${(alert.retrievedClauseIds || []).join(', ')}`,
      originalDraft,
      finalDispatchedText: finalMessage,
      overrideReason: isEdited ? 'Coordinator customized advisory message before sending.' : null,
      college: alert.college
    });

    close();
    renderCoordinatorAlerts(container, collegeScope);
    showToast({
      title: isEdited ? 'Edited advisory sent' : 'Advisory sent',
      message: `Sent to ${alert.student} and logged to audit trail.`,
      type: 'success'
    });
  };

  dialog.querySelector('#btn-hitl-approve-dispatch')?.addEventListener('click', () => dispatchIntervention(false));
  dialog.querySelector('#btn-hitl-edit-dispatch')?.addEventListener('click', () => dispatchIntervention(true));

  const overrideBox = dialog.querySelector('#hitl-override-box');
  dialog.querySelector('#btn-hitl-show-override')?.addEventListener('click', () => {
    if (overrideBox) {
      overrideBox.hidden = false;
      dialog.querySelector('#hitl-override-reason')?.focus();
    }
  });
  dialog.querySelector('#btn-cancel-override')?.addEventListener('click', () => {
    if (overrideBox) overrideBox.hidden = true;
  });

  dialog.querySelector('#btn-confirm-dismiss-flag')?.addEventListener('click', async () => {
    const reasonInput = dialog.querySelector('#hitl-override-reason');
    const reason = reasonInput?.value.trim() || '';
    if (reason.length < 5) {
      reasonInput?.setAttribute('aria-invalid', 'true');
      reasonInput?.focus();
      showToast({
        title: 'Reason required',
        message: 'Enter a brief reason (minimum 5 characters) to dismiss this alert.',
        type: 'warning'
      });
      return;
    }

    alert.hitlStatus = 'Dismissed / Overridden (False Positive)';
    alert.status = 'Dismissed / Overridden';

    await recordAuditLog({
      actionType: 'EARLY_WARNING_DISMISSED_OVERRIDE',
      targetStudent: `${alert.student} (${alert.studentNumber || alert.studentId})`,
      summary: `Dismissed ${alert.ruleLabel} alert with coordinator justification.`,
      ruleOrModelRef: `${alert.ruleCode} · ${(alert.retrievedClauseIds || []).join(', ')}`,
      originalDraft: alert.draftMessage || ragResult.synthesisText,
      finalDispatchedText: 'Alert dismissed (no message sent).',
      overrideReason: reason,
      college: alert.college
    });

    close();
    renderCoordinatorAlerts(container, collegeScope);
    showToast({
      title: 'Alert dismissed',
      message: 'Dismissal reason recorded in the audit trail.',
      type: 'info'
    });
  });

  dialog.addEventListener('close', () => {
    dialog.returnValue = '';
    dialog.remove();
  });

  dialog.showModal();
}

/* ==========================================================================
   6. INTERN DIRECTORY, EVALUATIONS & CLEARANCE
   ========================================================================== */
export function renderCoordinatorInternDirectory(container, collegeScope) {
  const state = getState();
  const students = getScopedStudents(collegeScope);

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('users', { size: 18 })} Intern Directory &amp; Clearance (${esc(collegeScope)})</h3>
          <p class="card-subtitle">Review intern academic standing, supervisor evaluations, and certify final completion clearance</p>
        </div>
      </div>

      <div tabindex="0" role="region" aria-label="Intern Directory" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Intern</th>
              <th>Program &amp; GPA</th>
              <th>Host Company</th>
              <th>Checklist</th>
              <th>Evaluation</th>
              <th>Clearance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${students
              .map(s => {
                const vDocs = (s.preDeploymentDocs || []).filter(d => d.status === 'Verified').length;
                const evalObj = state.evaluations.find(e => e.studentId === s.id || e.studentName === s.name);
                return `
                  <tr>
                    <th>
                      <div>${esc(s.name)}</div>
                      <div style="font-size: 0.72rem; color: var(--text-secondary);">${esc(s.studentNumber || s.id)} · ${esc(s.college)}</div>
                    </th>
                    <td data-label="Program & GPA">
                      <div>${esc(s.program)}</div>
                      <span class="badge badge-blue">GPA ${Number(s.gpa || 1.75).toFixed(2)} · ${esc(s.disciplinaryClearance || 'Cleared')}</span>
                    </td>
                    <td data-label="Host Company">${esc(s.company || 'Unassigned')}</td>
                    <td data-label="Checklist">
                      <span class="badge ${vDocs === 5 ? 'badge-success' : 'badge-rule-b'}">${vDocs}/5 Verified</span>
                    </td>
                    <td data-label="Evaluation">
                      ${
                        evalObj
                          ? `<span class="badge badge-gold">${evalObj.averageRating} / 5.00 (${evalObj.totalScore}/95)</span>`
                          : `<span class="badge badge-neutral">Pending</span>`
                      }
                    </td>
                    <td data-label="Clearance">
                      ${renderStatusBadge(evalObj?.coordinatorClearanceStatus || s.clearanceStatus || 'In Progress')}
                    </td>
                    <td data-label="Actions">
                      <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                        ${
                          evalObj
                            ? `<button type="button" class="btn btn-xs btn-secondary" data-view-eval="${s.id}">${icon('eye', { size: 13 })} Rubric</button>`
                            : ''
                        }
                        <button type="button" class="btn btn-xs btn-success" data-grant-clearance="${s.id}">
                          ${icon('check', { size: 13 })} Certify Clearance
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-view-eval]').forEach(btn => {
    btn.addEventListener('click', () => {
      const stuId = btn.getAttribute('data-view-eval');
      const stu = students.find(s => s.id === stuId);
      const evalObj = state.evaluations.find(e => e.studentId === stu?.id || e.studentName === stu?.name);
      if (evalObj) openEvaluationPreviewDialog(evalObj);
    });
  });

  container.querySelectorAll('[data-grant-clearance]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const stuId = btn.getAttribute('data-grant-clearance');
      const stu = students.find(s => s.id === stuId);
      if (!stu) return;

      const { confirmed } = await openConfirmModal({
        title: `Certify final clearance for ${stu.name}?`,
        message: `Confirm that ${stu.name} has completed all ${stu.college} hours, checklist documents, and evaluation requirements.`,
        confirmText: 'Certify Clearance',
        variant: 'success'
      });
      if (!confirmed) return;

      stu.clearanceStatus = 'Cleared & Certified';
      const evalObj = state.evaluations.find(e => e.studentId === stu.id || e.studentName === stu.name);
      if (evalObj) {
        evalObj.coordinatorClearanceStatus = 'Cleared & Certified';
        evalObj.coordinatorClearedBy = state.currentUser?.name || 'OJT Coordinator';
      }

      await recordAuditLog({
        actionType: 'FINAL_OJT_CLEARANCE_CERTIFIED',
        targetStudent: `${stu.name} (${stu.studentNumber || stu.id})`,
        summary: `Certified final OJT clearance for ${stu.name}.`,
        ruleOrModelRef: 'Final Completion Clearance',
        originalDraft: 'In Progress',
        finalDispatchedText: 'Cleared & Certified',
        college: stu.college
      });

      renderCoordinatorInternDirectory(container, collegeScope);
      showToast({
        title: 'Clearance certified',
        message: `${stu.name} is now cleared for OJT completion.`,
        type: 'success'
      });
    });
  });
}

/* ==========================================================================
   7. COLLEGE SETTINGS (QUOTAS & THRESHOLDS)
   ========================================================================== */
export function renderCoordinatorThresholdSettings(container, collegeScope) {
  const state = getState();
  const targetCol = collegeScope === 'ALL' ? 'CITE' : collegeScope;
  const cfg = state.collegeSettings[targetCol] || {
    college: targetCol,
    fullName: NEMSU_COLLEGES[targetCol]?.name || targetCol,
    requiredHours: 324,
    maxGpaCutoff: 2.5,
    ruleAMaxConsecutiveAbsences: 3,
    ruleAMaxDeficitPct: 15,
    ruleBConsecutiveWeeks: 3,
    ruleBClericalKeywords: ['photocopying', 'xerox', 'coffee errands', 'personal errands', 'unrelated filing']
  };

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('settings', { size: 18 })} College Quotas &amp; Alert Thresholds (${esc(targetCol)})</h3>
          <p class="card-subtitle">Configure required training hours and early-warning rules for ${esc(cfg.fullName)}</p>
        </div>
        <span class="badge badge-gold">${esc(targetCol)}</span>
      </div>

      <form id="threshold-settings-form">
        <div class="grid-3">
          <div class="form-group">
            <label class="form-label" for="cfg-req-hours">Required OJT Hours</label>
            <input type="number" id="cfg-req-hours" class="form-input" min="100" max="1200" value="${cfg.requiredHours}" required />
            <span class="form-hint">CITE: 324h · CET: 486h · CBM: 400h · CTE: 360h · CAS: 300h</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="cfg-gpa-cutoff">Default GPA Cutoff</label>
            <input type="number" id="cfg-gpa-cutoff" class="form-input" step="0.05" min="1.0" max="3.0" value="${cfg.maxGpaCutoff}" required />
            <span class="form-hint">1.00 = Highest, 3.00 = Passing</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="cfg-rule-a-abs">Max Consecutive Absences (Days)</label>
            <input type="number" id="cfg-rule-a-abs" class="form-input" min="1" max="15" value="${cfg.ruleAMaxConsecutiveAbsences}" required />
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label" for="cfg-rule-a-def">Max Hours Deficit (%)</label>
            <input type="number" id="cfg-rule-a-def" class="form-input" min="5" max="50" value="${cfg.ruleAMaxDeficitPct}" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="cfg-rule-b-wks">Consecutive Task Mismatch Weeks</label>
            <input type="number" id="cfg-rule-b-wks" class="form-input" min="1" max="8" value="${cfg.ruleBConsecutiveWeeks}" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="cfg-rule-b-kw">Flagged Non-Degree Clerical Terms (Comma-separated)</label>
          <textarea id="cfg-rule-b-kw" class="form-textarea" rows="3" required>${esc((cfg.ruleBClericalKeywords || []).join(', '))}</textarea>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button type="submit" id="btn-save-thresholds" class="btn btn-primary">${icon('check', { size: 15 })} Save Settings</button>
        </div>
      </form>
    </div>
  `;

  container.querySelector('#threshold-settings-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    cfg.requiredHours = Number(container.querySelector('#cfg-req-hours')?.value) || 324;
    cfg.maxGpaCutoff = Number(container.querySelector('#cfg-gpa-cutoff')?.value) || 2.5;
    cfg.ruleAMaxConsecutiveAbsences = Number(container.querySelector('#cfg-rule-a-abs')?.value) || 3;
    cfg.ruleAMaxDeficitPct = Number(container.querySelector('#cfg-rule-a-def')?.value) || 15;
    cfg.ruleBConsecutiveWeeks = Number(container.querySelector('#cfg-rule-b-wks')?.value) || 3;
    cfg.ruleBClericalKeywords = (container.querySelector('#cfg-rule-b-kw')?.value || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    state.collegeSettings[targetCol] = cfg;

    await recordAuditLog({
      actionType: 'COLLEGE_THRESHOLDS_UPDATED',
      targetStudent: `All ${targetCol} Interns`,
      summary: `Updated ${targetCol} OJT quota (${cfg.requiredHours}h) and alert thresholds.`,
      ruleOrModelRef: 'College Settings',
      originalDraft: '',
      finalDispatchedText: JSON.stringify(cfg),
      college: targetCol
    });

    confirmInPlace(
      container.querySelector('#btn-save-thresholds'),
      `${icon('checkCircle', { size: 15 })} Settings Saved`
    );

    showToast({
      title: `${targetCol} settings saved`,
      message: `Required hours (${cfg.requiredHours}h) and alert thresholds updated.`,
      type: 'success'
    });
  });
}
