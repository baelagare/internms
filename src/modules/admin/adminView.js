import {
  getState,
  persistDatabase,
  setAdminCollegeFilter,
  getScopedStudents,
  getScopedAlerts,
  getScopedHtes,
  getCollegeQuotaHours,
  NEMSU_COLLEGES
} from '../../state/store.js';
import { showToast } from '../../components/ui/ToastManager.js';
import { openDrawer } from '../../components/ui/Drawer.js';
import { renderRuleBadge } from '../../components/ui/Badge.js';
import {
  renderCoordinatorPlacementQueue,
  renderCoordinatorAlerts,
  renderCoordinatorPartnersCrud,
  renderCoordinatorInternDirectory,
  renderCoordinatorThresholdSettings
} from '../coordinator/coordinatorView.js';
import { renderMessagesWorkspace } from '../messaging/chatView.js';
import { icon } from '../../components/ui/Icons.js';
import { esc, actionLabel, formatDateTime } from '../../utils/html.js';

export function renderAdminWorkspace(container, subRoute = 'dashboard') {
  const state = getState();
  const activeCol = state.adminCollegeFilter || 'ALL';

  const wrapper = document.createElement('div');

  const filterBarHtml = `
    <div class="college-filter-bar no-print" role="region" aria-label="College Filter">
      <div style="display: flex; align-items: center; gap: 0.65rem;">
        ${icon('building', { size: 18 })}
        <div>
          <strong style="font-size: 0.88rem; color: var(--nemsu-gold-400);">
            College Scope
          </strong>
          <div style="font-size: 0.75rem; color: rgba(255,255,255,0.84);">
            ${activeCol === 'ALL' ? 'All 5 Participating Colleges' : `${esc(activeCol)} · ${esc(NEMSU_COLLEGES[activeCol]?.name || '')}`}
          </div>
        </div>
      </div>

      <div class="college-filter-pills">
        ${['ALL', 'CAS', 'CBM', 'CET', 'CITE', 'CTE']
          .map(
            code => `
          <button
            type="button"
            class="college-pill-btn"
            data-admin-col-filter="${code}"
            aria-pressed="${activeCol === code ? 'true' : 'false'}"
          >
            ${code === 'ALL' ? 'All Colleges' : code}
          </button>
        `
          )
          .join('')}
      </div>
    </div>
    <div id="admin-subview-mount"></div>
  `;

  wrapper.innerHTML = filterBarHtml;
  container.innerHTML = '';
  container.appendChild(wrapper);

  wrapper.querySelectorAll('[data-admin-col-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const col = btn.getAttribute('data-admin-col-filter');
      setAdminCollegeFilter(col);
      renderAdminWorkspace(container, subRoute);
    });
  });

  const subMount = wrapper.querySelector('#admin-subview-mount');
  if (!subMount) return;

  if (subRoute === 'messages') {
    renderMessagesWorkspace(subMount);
    return;
  }
  if (subRoute === 'staff') {
    renderAdminStaffManager(subMount, activeCol);
    return;
  }
  if (subRoute === 'corpus') {
    renderAdminRagCorpusManager(subMount);
    return;
  }
  if (subRoute === 'audit-logs') {
    renderAdminAuditTrailViewer(subMount, activeCol);
    return;
  }
  if (subRoute === 'settings') {
    renderAdminUniversitySettings(subMount, activeCol);
    return;
  }
  if (subRoute === 'placement') {
    renderCoordinatorPlacementQueue(subMount, activeCol);
    return;
  }
  if (subRoute === 'alerts') {
    renderCoordinatorAlerts(subMount, activeCol);
    return;
  }
  if (subRoute === 'partners') {
    renderCoordinatorPartnersCrud(subMount, activeCol);
    return;
  }
  if (subRoute === 'interns') {
    renderCoordinatorInternDirectory(subMount, activeCol);
    return;
  }

  renderAdminExecutiveDashboard(subMount, activeCol);
}

/* ==========================================================================
   1. UNIVERSITY EXECUTIVE DASHBOARD
   ========================================================================== */
function renderAdminExecutiveDashboard(container, activeCol) {
  const state = getState();
  const students = getScopedStudents(activeCol);
  const htes = getScopedHtes(activeCol);

  const collegesToSummarize = activeCol === 'ALL' ? ['CAS', 'CBM', 'CET', 'CITE', 'CTE'] : [activeCol];

  container.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Active Interns (${esc(activeCol)})</span>
        <div class="kpi-value">${students.length}</div>
        <div class="kpi-sub">Across ${collegesToSummarize.length} college(s)</div>
      </div>

      <div class="kpi-card gold">
        <span class="kpi-label">Policy Clauses</span>
        <div class="kpi-value">${state.policyCorpus.length}</div>
        <div class="kpi-sub">CHED CMO No. 104 &amp; NEMSU Manual</div>
      </div>

      <div class="kpi-card success">
        <span class="kpi-label">Partner Companies</span>
        <div class="kpi-value">${htes.length}</div>
        <div class="kpi-sub">Active host training establishments</div>
      </div>

      <div class="kpi-card purple">
        <span class="kpi-label">Audit Trail Records</span>
        <div class="kpi-value">${state.auditLogs.length}</div>
        <div class="kpi-sub">Logged coordinator actions</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('barChart', { size: 18 })} College Compliance Summary</h3>
          <p class="card-subtitle">Hour quotas, checklist completion, placements, and active risk alerts by college</p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <a href="#/admin/corpus" class="btn btn-sm btn-secondary">Policy Corpus</a>
          <a href="#/admin/audit-logs" class="btn btn-sm btn-primary">Audit Trail</a>
        </div>
      </div>

      <div tabindex="0" role="region" aria-label="College Compliance Summary" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>College</th>
              <th>Coordinator</th>
              <th>Quota</th>
              <th>Deployed</th>
              <th>Checklists (5/5)</th>
              <th>Partners</th>
              <th>Risk Alerts</th>
            </tr>
          </thead>
          <tbody>
            ${collegesToSummarize
              .map(code => {
                const colStudents = state.users.filter(u => u.role === 'student' && u.college === code);
                const coord = state.users.filter(u => u.role === 'coordinator' && u.college === code)[0];
                const deployed = colStudents.filter(s => s.placementStatus === 'Approved & Deployed').length;
                const docsOk = colStudents.filter(
                  s => (s.preDeploymentDocs || []).filter(d => d.status === 'Verified').length === 5
                ).length;
                const colHtes = state.htes.filter(h => h.college === code).length;
                const colAlerts = state.alerts.filter(a => a.college === code);
                const quota = getCollegeQuotaHours(code);

                return `
                  <tr>
                    <th>
                      <span class="badge badge-blue">${code}</span>
                      <div style="font-size: 0.74rem; color: var(--text-secondary); margin-top: 0.15rem;">
                        ${esc(NEMSU_COLLEGES[code]?.name || code)}
                      </div>
                    </th>
                    <td data-label="Coordinator">${esc(coord?.name || 'Unassigned')}</td>
                    <td data-label="Quota"><strong>${quota} hrs</strong></td>
                    <td data-label="Deployed">${deployed} / ${colStudents.length} Interns</td>
                    <td data-label="Checklists">
                      <span class="badge ${docsOk === colStudents.length ? 'badge-success' : 'badge-rule-b'}">
                        ${docsOk} / ${colStudents.length} Verified
                      </span>
                    </td>
                    <td data-label="Partners">${colHtes}</td>
                    <td data-label="Risk Alerts">
                      ${
                        colAlerts.length === 0
                          ? `<span class="badge badge-success">None</span>`
                          : colAlerts.map(a => renderRuleBadge(a.ruleId)).join(' ')
                      }
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
}

/* ==========================================================================
   2. STAFF & SUPERVISOR ACCOUNTS
   ========================================================================== */
function renderAdminStaffManager(container, activeCol) {
  const state = getState();
  const staffList = state.users.filter(u => {
    if (u.role === 'student') return false;
    if (activeCol !== 'ALL' && u.role === 'coordinator' && u.college !== activeCol) return false;
    return true;
  });

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('users', { size: 18 })} Coordinators &amp; Partner Supervisors</h3>
          <p class="card-subtitle">Manage college OJT coordinators and partner company supervisors</p>
        </div>
        <button type="button" class="btn btn-sm btn-primary" id="btn-add-staff-account">
          ${icon('plus', { size: 14 })} Add Account
        </button>
      </div>

      <div tabindex="0" role="region" aria-label="Staff Accounts" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name &amp; Title</th>
              <th>Role</th>
              <th>Login ID / Email</th>
              <th>College / Company</th>
              <th>Invite Token</th>
            </tr>
          </thead>
          <tbody>
            ${staffList
              .map(
                u => `
              <tr>
                <th>
                  <div>${esc(u.name)}</div>
                  <div style="font-size: 0.72rem; color: var(--text-secondary);">${esc(u.title || '')}</div>
                </th>
                <td data-label="Role">
                  <span class="badge ${u.role === 'admin' ? 'badge-gold' : u.role === 'coordinator' ? 'badge-blue' : 'badge-success'}">
                    ${esc(u.role.toUpperCase())}
                  </span>
                </td>
                <td data-label="Login ID">
                  <code>${esc(u.id)}</code>
                  ${u.email ? `<div style="font-size: 0.74rem; color: var(--text-secondary);">${esc(u.email)}</div>` : ''}
                </td>
                <td data-label="Scope">
                  <strong>${esc(u.college || u.company || 'University-Wide')}</strong>
                </td>
                <td data-label="Invite Token">
                  ${u.inviteToken ? `<code>${esc(u.inviteToken)}</code>` : '-'}
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

  container.querySelector('#btn-add-staff-account')?.addEventListener('click', () => {
    openDrawer({
      title: 'Add Coordinator or Supervisor',
      contentHtml: `
        <form id="add-staff-form">
          <div class="form-group">
            <label class="form-label" for="st-role">Role</label>
            <select id="st-role" class="form-select">
              <option value="coordinator">College OJT Coordinator</option>
              <option value="supervisor">Partner Company Supervisor</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="st-name">Full Name</label>
            <input type="text" id="st-name" class="form-input" placeholder="e.g., Prof. Maria L. Santos, MIT" required />
          </div>
          <div class="grid-2" style="gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label" for="st-id">Login ID / Email</label>
              <input type="text" id="st-id" class="form-input" placeholder="coord.cite2@nemsu.edu.ph" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="st-pass">Initial Password</label>
              <input type="password" id="st-pass" class="form-input" value="coord123" required />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="st-scope">College Code (CAS/CBM/CET/CITE/CTE) or Company Name</label>
            <input type="text" id="st-scope" class="form-input" value="CITE" required />
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%;">Create Account</button>
        </form>
      `,
      onMount: (drawerEl, closeDrawer) => {
        drawerEl.querySelector('#add-staff-form')?.addEventListener('submit', async e => {
          e.preventDefault();
          const role = drawerEl.querySelector('#st-role')?.value;
          const name = drawerEl.querySelector('#st-name')?.value.trim();
          const id = drawerEl.querySelector('#st-id')?.value.trim();
          const pass = drawerEl.querySelector('#st-pass')?.value.trim();
          const scope = drawerEl.querySelector('#st-scope')?.value.trim();
          if (!name || !id) return;

          getState().users.push({
            id,
            email: id.includes('@') ? id : `${id}@nemsu.edu.ph`,
            pass,
            role,
            name,
            college: role === 'coordinator' ? scope.toUpperCase() : undefined,
            company: role === 'supervisor' ? scope : undefined,
            title: role === 'coordinator' ? `${scope.toUpperCase()} OJT Coordinator` : `Supervisor · ${scope}`,
            inviteToken: role === 'supervisor' ? `HTE-${Date.now().toString().slice(-4)}` : undefined
          });

          await persistDatabase(false);
          closeDrawer();
          renderAdminStaffManager(container, activeCol);
          showToast({ title: 'Account created', message: `${name} (${role}) added.`, type: 'success' });
        });
      }
    });
  });
}

/* ==========================================================================
   3. POLICY CORPUS MANAGER
   ========================================================================== */
function renderAdminRagCorpusManager(container) {
  const state = getState();
  const corpus = state.policyCorpus || [];

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('bookOpen', { size: 18 })} Policy Corpus</h3>
          <p class="card-subtitle">
            Indexed clauses from CHED CMO No. 104, s. 2017 and the NEMSU Student Manual (2026–2027)
          </p>
        </div>
        <button type="button" class="btn btn-sm btn-primary" id="btn-add-policy-chunk">
          ${icon('plus', { size: 14 })} Add Policy Clause
        </button>
      </div>

      <div tabindex="0" role="region" aria-label="Policy Corpus Table" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Clause ID &amp; Source</th>
              <th>Section &amp; Title</th>
              <th>Alert Category</th>
              <th>Clause Text</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${corpus
              .map(
                c => `
              <tr>
                <th>
                  <code style="color: var(--nemsu-blue-700);">${esc(c.chunkId)}</code>
                  <div style="font-size: 0.75rem; color: var(--text-primary); margin-top: 0.15rem;">${esc(c.sourceDoc)}</div>
                </th>
                <td data-label="Section & Title">
                  <strong>${esc(c.sectionRef)}</strong>
                  <div style="font-size: 0.76rem; color: var(--text-secondary);">${esc(c.title)}</div>
                </td>
                <td data-label="Alert Category">
                  ${renderRuleBadge(c.ruleCategory)}
                </td>
                <td data-label="Clause Text" style="max-width: 440px; font-size: 0.79rem; line-height: 1.45;">
                  "${esc(c.verbatimText)}"
                </td>
                <td data-label="Status">
                  <span class="badge badge-success">${icon('check', { size: 12 })} Indexed</span>
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

  container.querySelector('#btn-add-policy-chunk')?.addEventListener('click', () => {
    openDrawer({
      title: 'Add Policy Clause',
      contentHtml: `
        <form id="add-policy-chunk-form">
          <div class="grid-2" style="gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label" for="pol-id">Clause ID</label>
              <input type="text" id="pol-id" class="form-input mono" value="CHED-CMO104-ART9-SEC22" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="pol-rule">Alert Category</label>
              <select id="pol-rule" class="form-select">
                <option value="RULE_A_ATTENDANCE">Attendance risk</option>
                <option value="RULE_B_MISALIGNMENT">Task mismatch</option>
                <option value="RULE_C_DOCS">Missing documents</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="pol-doc">Source Document</label>
            <select id="pol-doc" class="form-select">
              <option value="CHED CMO No. 104, s. 2017">CHED CMO No. 104, s. 2017</option>
              <option value="NEMSU Student Manual (2026–2027 Edition)">NEMSU Student Manual (2026–2027 Edition)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="pol-sec">Section Reference</label>
            <input type="text" id="pol-sec" class="form-input" placeholder="Article IX, Section 22.1" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="pol-title">Clause Title</label>
            <input type="text" id="pol-title" class="form-input" placeholder="Grievance &amp; Welfare Protection" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="pol-text">Verbatim Clause Text</label>
            <textarea id="pol-text" class="form-textarea" rows="4" required></textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%;">Save Policy Clause</button>
        </form>
      `,
      onMount: (drawerEl, closeDrawer) => {
        drawerEl.querySelector('#add-policy-chunk-form')?.addEventListener('submit', async e => {
          e.preventDefault();
          const chunkId = drawerEl.querySelector('#pol-id')?.value.trim();
          const ruleCategory = drawerEl.querySelector('#pol-rule')?.value;
          const sourceDoc = drawerEl.querySelector('#pol-doc')?.value;
          const sectionRef = drawerEl.querySelector('#pol-sec')?.value.trim();
          const title = drawerEl.querySelector('#pol-title')?.value.trim();
          const verbatimText = drawerEl.querySelector('#pol-text')?.value.trim();
          if (!chunkId || !verbatimText) return;

          getState().policyCorpus.unshift({
            chunkId,
            sourceDoc,
            sectionRef,
            title,
            ruleCategory,
            verbatimText,
            keywords: title.toLowerCase().split(' '),
            embeddingDim: 384,
            lastIndexed: new Date().toISOString().slice(0, 10),
            status: 'Indexed'
          });

          await persistDatabase(false);
          closeDrawer();
          renderAdminRagCorpusManager(container);
          showToast({
            title: 'Clause added',
            message: `${chunkId} saved to policy corpus.`,
            type: 'success'
          });
        });
      }
    });
  });
}

/* ==========================================================================
   4. COLLEGE SETTINGS
   ========================================================================== */
function renderAdminUniversitySettings(container, activeCol) {
  const targetCol = activeCol === 'ALL' ? 'CITE' : activeCol;
  renderCoordinatorThresholdSettings(container, targetCol);
}

/* ==========================================================================
   5. AUDIT TRAIL VIEWER
   ========================================================================== */
function renderAdminAuditTrailViewer(container, activeCol) {
  const state = getState();
  const logs = (state.auditLogs || []).filter(
    l => activeCol === 'ALL' || l.college === activeCol || l.college === 'ALL'
  );

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${icon('history', { size: 18 })} Governance Audit Trail</h3>
          <p class="card-subtitle">
            Append-only log of placement approvals, overrides, advisory dispatches, and alert dismissals
          </p>
        </div>
        <button type="button" class="btn btn-sm btn-secondary" id="btn-export-audit-json">
          ${icon('download', { size: 14 })} Export JSON
        </button>
      </div>

      <div tabindex="0" role="region" aria-label="Governance Audit Trail" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Entry &amp; Date</th>
              <th>Reviewer</th>
              <th>Action &amp; Student</th>
              <th>Reference</th>
              <th>Outcome</th>
              <th>Notes / Reason</th>
            </tr>
          </thead>
          <tbody>
            ${logs
              .map(
                entry => `
              <tr>
                <th>
                  <code style="color: var(--nemsu-blue-700);">${esc(entry.id)}</code>
                  <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.15rem;">
                    ${esc(formatDateTime(entry.timestamp))}
                  </div>
                </th>
                <td data-label="Reviewer">
                  <strong>${esc(entry.actorName)}</strong>
                  <div style="font-size: 0.72rem; color: var(--text-secondary);">
                    ${esc((entry.actorRole || '').toUpperCase())} · ${esc(entry.college)}
                  </div>
                </td>
                <td data-label="Action & Student">
                  <span class="badge badge-blue">${esc(actionLabel(entry.actionType))}</span>
                  <div style="font-size: 0.78rem; font-weight: 700; margin-top: 0.2rem;">${esc(entry.targetStudent)}</div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">${esc(entry.summary)}</div>
                </td>
                <td data-label="Reference" style="font-size: 0.76rem;">
                  <code>${esc(entry.ruleOrModelRef)}</code>
                </td>
                <td data-label="Outcome" style="max-width: 300px; font-size: 0.76rem;">
                  <div style="color: var(--nemsu-blue-900);">${esc((entry.finalDispatchedText || '').slice(0, 140))}</div>
                </td>
                <td data-label="Notes / Reason" style="max-width: 240px; font-size: 0.76rem; color: ${entry.overrideReason ? 'var(--rule-c-text)' : 'var(--text-muted)'}; font-weight: ${entry.overrideReason ? '700' : '400'};">
                  ${esc(entry.overrideReason || 'Standard approval')}
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

  container.querySelector('#btn-export-audit-json')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `internms_audit_trail_${activeCol}_2026.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast({
      title: 'Audit log exported',
      message: `Downloaded ${logs.length} records.`,
      type: 'success'
    });
  });
}
