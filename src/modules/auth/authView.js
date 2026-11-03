import { getState, setCurrentUser, loadInitialDatabase, NEMSU_COLLEGES, inferCollegeFromProgram } from '../../state/store.js';
import { navigateTo, getDefaultRouteForRole } from '../../router/hashRouter.js';
import { showToast } from '../../components/ui/ToastManager.js';
import { icon } from '../../components/ui/Icons.js';
import { LOGOS, esc } from '../../utils/html.js';

let initialLoginTab = 'login';
let selectedLandingCollege = 'CITE';

function renderCollegeExplorerContent(collegeCode) {
  const state = getState();
  const col = NEMSU_COLLEGES[collegeCode] || NEMSU_COLLEGES.CITE;
  const threshold = state.thresholds?.[col.code] || { requiredHours: col.requiredHours, minGpaCutoff: 2.5 };
  const htes = (state.htes || []).filter(h => h.college === col.code);
  const totalSlots = htes.reduce((acc, h) => acc + (Number(h.maxSlots) || 0), 0);
  const openSlots = htes.reduce((acc, h) => acc + Math.max(0, (Number(h.maxSlots) || 0) - (Number(h.filledSlots) || 0)), 0);

  return `
    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
      <div>
        <strong style="font-size: 0.92rem; color: var(--nemsu-blue-950); display: block;">${esc(col.code)} · ${esc(col.name)}</strong>
        <span style="font-size: 0.78rem; color: var(--text-muted);">${esc(col.programs.join(' · '))}</span>
      </div>
      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
        <span class="badge badge-blue num">${esc(String(threshold.requiredHours || col.requiredHours))} hrs required</span>
        <span class="badge badge-neutral num">GPA &le; ${Number(threshold.minGpaCutoff || 2.5).toFixed(2)}</span>
        <span class="badge badge-success num">${openSlots}/${totalSlots} slots open</span>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      ${htes
        .slice(0, 2)
        .map(
          h => `
        <div style="background: var(--surface-white); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); padding: 0.68rem 0.85rem; display: flex; flex-direction: column; gap: 0.35rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
            <strong style="font-size: 0.83rem; color: var(--text-primary);">${esc(h.name)}</strong>
            <span class="badge badge-blue num">${esc(String((h.maxSlots || 5) - (h.filledSlots || 0)))} open</span>
          </div>
          <div style="font-size: 0.77rem; color: var(--text-secondary);">${esc(h.roleTitle)} · ${esc(h.location)}</div>
          <div class="chip-list">
            ${(h.requiredSkills || [])
              .slice(0, 4)
              .map(s => `<span class="chip" style="font-size: 0.7rem; padding: 0.14rem 0.48rem;">${esc(s)}</span>`)
              .join('')}
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

export function renderLandingPage(container) {
  const state = getState();
  const colleges = Object.values(NEMSU_COLLEGES);
  const totalHtes = (state.htes || []).length || 10;
  const totalStudents = (state.users || []).filter(u => u.role === 'student').length || 14;

  container.innerHTML = `
    <a href="#landing-main" class="skip-link">Skip to main content</a>
    <div class="landing-page">
      <header class="landing-navbar">
        <div class="landing-navbar-inner">
          <a href="#/" class="landing-brand" aria-label="InternMS Home">
            <img src="${LOGOS.seal}" alt="NEMSU Official Seal" class="landing-brand-seal" width="42" height="42" fetchpriority="high" />
            <img src="${LOGOS.mark}" alt="NEMSU SIS Mark" class="landing-brand-mark" width="28" height="40" fetchpriority="high" />
            <div class="landing-brand-text">
              <strong translate="no">InternMS</strong>
              <span>NEMSU Main Campus · Tandag City</span>
            </div>
          </a>

          <div class="landing-nav-actions">
            <span class="badge badge-gold">${esc(state.academicYear || 'A.Y. 2026–2027')}</span>
            <button type="button" class="btn btn-secondary btn-sm" id="landing-btn-register">
              Student Sign Up
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="landing-btn-signin">
              Sign In ${icon('arrowRight', { size: 15 })}
            </button>
          </div>
        </div>
      </header>

      <main class="landing-main" id="landing-main" tabindex="-1">
        <section class="landing-hero-section">
          <div class="landing-hero-content">
            <h1>Internship placement and compliance for NEMSU Main Campus.</h1>
            <p class="landing-lead">
              One workspace for students, college OJT coordinators, and partner supervisors across all five colleges at North Eastern Mindanao State University.
            </p>
            <div class="landing-cta-row">
              <button type="button" class="btn btn-primary btn-lg" id="hero-btn-signin">
                Sign In to Workspace ${icon('arrowRight', { size: 18 })}
              </button>
              <button type="button" class="btn btn-secondary btn-lg" id="hero-btn-hte">
                ${icon('building', { size: 18 })} Partner Supervisor Access
              </button>
            </div>

            <div class="landing-metrics-row" aria-label="Campus Scope">
              <div class="landing-metric-cell">
                <strong>5</strong>
                <span>Participating colleges</span>
              </div>
              <div class="landing-metric-cell">
                <strong>${esc(String(totalHtes))}</strong>
                <span>Accredited partner HTEs</span>
              </div>
              <div class="landing-metric-cell">
                <strong>${esc(String(totalStudents))}</strong>
                <span>Active cohort records</span>
              </div>
            </div>
          </div>

          <div class="landing-hero-card" data-ui="true">
            <div class="landing-seal-showcase">
              <img src="${LOGOS.seal}" alt="North Eastern Mindanao State University Seal" width="60" height="60" />
              <div>
                <h2>Live College Placement Explorer</h2>
                <p>Select a college to inspect required OJT hours and accredited partner slots.</p>
              </div>
            </div>

            <div class="landing-college-selector" role="tablist" aria-label="Select NEMSU College">
              ${colleges
                .map(
                  c => `
                  <button
                    type="button"
                    role="tab"
                    class="landing-college-tab"
                    data-college-tab="${esc(c.code)}"
                    aria-selected="${c.code === selectedLandingCollege ? 'true' : 'false'}"
                  >
                    ${esc(c.code)}
                  </button>
                `
                )
                .join('')}
            </div>

            <div class="landing-explorer-panel" id="landing-explorer-panel" role="tabpanel" aria-live="polite">
              ${renderCollegeExplorerContent(selectedLandingCollege)}
            </div>
          </div>
        </section>

        <section class="landing-features-section" aria-labelledby="capabilities-heading">
          <h2 id="capabilities-heading">Core capabilities</h2>
          <div class="landing-features-grid">
            <article class="landing-feature-card">
              <h3>${icon('compass', { size: 19 })} Smart Placement Matching</h3>
              <p>Evaluates GPA, clearance, and verified pre-deployment documents first, then ranks accredited partners by skill and coursework alignment.</p>
            </article>

            <article class="landing-feature-card">
              <h3>${icon('clock', { size: 19 })} Two-Tier Attendance &amp; Task Verification</h3>
              <p>Host supervisors verify daily time records and weekly competency logs on site before college coordinators credit official hours.</p>
            </article>

            <article class="landing-feature-card">
              <h3>${icon('alert', { size: 19 })} Policy-Grounded Early Warnings</h3>
              <p>Detects attendance deficits, task mismatches, and missing documents with direct citations to CHED CMO No. 104, s. 2017 and the NEMSU Manual.</p>
            </article>

            <article class="landing-feature-card">
              <h3>${icon('lock', { size: 19 })} Privacy &amp; Coordinator Governance</h3>
              <p>Coordinators review and approve every placement and intervention notice. Student identifiers are sanitized before policy synthesis.</p>
            </article>
          </div>
        </section>
      </main>

      <footer class="landing-footer">
        <div class="landing-footer-inner">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <img src="${LOGOS.seal}" alt="" width="24" height="24" loading="lazy" />
            <span>North Eastern Mindanao State University · Rosario, Tandag City, Surigao del Sur</span>
          </div>
          <span>Aligned with CHED CMO No. 104, s. 2017 &amp; RA 10173</span>
        </div>
      </footer>
    </div>
  `;

  const explorerPanel = container.querySelector('#landing-explorer-panel');
  const collegeTabs = container.querySelectorAll('[data-college-tab]');
  collegeTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedLandingCollege = btn.getAttribute('data-college-tab') || 'CITE';
      collegeTabs.forEach(t => {
        t.setAttribute('aria-selected', t === btn ? 'true' : 'false');
      });
      if (explorerPanel) {
        explorerPanel.innerHTML = renderCollegeExplorerContent(selectedLandingCollege);
      }
    });
  });

  container.querySelector('#landing-btn-signin')?.addEventListener('click', () => {
    initialLoginTab = 'login';
    navigateTo('#/login');
  });
  container.querySelector('#hero-btn-signin')?.addEventListener('click', () => {
    initialLoginTab = 'login';
    navigateTo('#/login');
  });
  container.querySelector('#landing-btn-register')?.addEventListener('click', () => {
    initialLoginTab = 'register';
    navigateTo('#/login');
  });
  container.querySelector('#hero-btn-hte')?.addEventListener('click', () => {
    initialLoginTab = 'hte';
    navigateTo('#/login');
  });
}

function wirePasswordToggle(btn, input) {
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.setAttribute('aria-pressed', showing ? 'false' : 'true');
    btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    btn.innerHTML = icon(showing ? 'eye' : 'eyeOff', { size: 16 });
  });
}

function triggerShake(el) {
  if (!el) return;
  el.classList.remove('error-shake');
  void el.offsetWidth;
  el.classList.add('error-shake');
}

export function renderAuthGateway(container) {
  const state = getState();

  const programOptionsHtml = Object.values(NEMSU_COLLEGES)
    .map(
      col => `
      <optgroup label="${col.code} · ${col.name}">
        ${col.programs.map(p => `<option value="${p}" data-college="${col.code}">${p}</option>`).join('')}
      </optgroup>
    `
    )
    .join('');

  container.innerHTML = `
    <a href="#auth-card" class="skip-link">Skip to sign in</a>
    <main class="login-screen">
      <div class="login-topbar">
        <a href="#/" class="btn btn-secondary btn-sm" id="btn-back-landing">
          ${icon('arrowLeft', { size: 16 })} Back to Home
        </a>
        <span class="badge badge-gold">${esc(state.academicYear || 'A.Y. 2026–2027')}</span>
      </div>

      <section class="login-card-wrap">
        <div class="auth-card" id="auth-card" tabindex="-1">
          <div class="login-brand-header">
            <div class="login-brand-logos">
              <img src="${LOGOS.seal}" alt="NEMSU Seal" class="login-seal-img" width="48" height="48" fetchpriority="high" />
              <img src="${LOGOS.mark}" alt="NEMSU Mark" class="login-mark-img" width="30" height="44" fetchpriority="high" />
            </div>
            <div>
              <h1 style="font-size: 1.25rem; color: var(--nemsu-blue-950); margin: 0;">Sign in to InternMS</h1>
              <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.15rem;">
                NEMSU Main Campus OJT Management Portal
              </p>
            </div>
          </div>

          <div class="auth-tabs" role="tablist" aria-label="Access Mode">
            <button type="button" role="tab" class="auth-tab-btn" id="tab-btn-login" aria-selected="true" aria-controls="panel-login">
              Sign In
            </button>
            <button type="button" role="tab" class="auth-tab-btn" id="tab-btn-register" aria-selected="false" aria-controls="panel-register">
              Student Sign Up
            </button>
            <button type="button" role="tab" class="auth-tab-btn" id="tab-btn-hte" aria-selected="false" aria-controls="panel-hte">
              Partner Access
            </button>
          </div>

          <!-- TAB 1: SIGN IN -->
          <form id="panel-login" role="tabpanel" aria-labelledby="tab-btn-login" novalidate>
            <div class="form-group">
              <label class="form-label" for="login-identifier">ID, Email, or Username</label>
              <input
                type="text"
                id="login-identifier"
                name="identifier"
                class="form-input"
                required
                autocomplete="username"
                spellcheck="false"
                placeholder="e.g., student, coordinator.cite@nemsu.edu.ph…"
                aria-describedby="login-id-error"
                aria-errormessage="login-id-error"
              />
              <span id="login-id-error" class="field-error-msg">Enter your institutional ID, email, or username.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="login-password">Password</label>
              <div class="password-input-wrap">
                <input
                  type="password"
                  id="login-password"
                  name="password"
                  class="form-input"
                  required
                  autocomplete="current-password"
                  placeholder="Enter your password…"
                  aria-describedby="login-pass-error"
                  aria-errormessage="login-pass-error"
                />
                <button
                  type="button"
                  class="password-toggle-btn"
                  id="btn-toggle-login-pass"
                  aria-label="Show password"
                  aria-pressed="false"
                >
                  ${icon('eye', { size: 16 })}
                </button>
              </div>
              <span id="login-pass-error" class="field-error-msg">Enter your account password.</span>
            </div>

            <div id="login-inline-alert" class="field-error-msg" role="alert" aria-live="polite" style="margin-bottom: 0.75rem;"></div>

            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.68rem;">
              Sign In ${icon('arrowRight', { size: 16 })}
            </button>
          </form>

          <!-- TAB 2: STUDENT SIGN UP -->
          <form id="panel-register" role="tabpanel" aria-labelledby="tab-btn-register" hidden novalidate>
            <div class="grid-2" style="gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label" for="reg-id">Student ID</label>
                <input
                  type="text"
                  id="reg-id"
                  name="studentId"
                  class="form-input"
                  required
                  autocomplete="username"
                  spellcheck="false"
                  placeholder="2023-01999…"
                  aria-describedby="reg-id-err"
                  aria-errormessage="reg-id-err"
                />
                <span id="reg-id-err" class="field-error-msg">Enter your NEMSU Student ID (e.g., 2023-01999).</span>
              </div>
              <div class="form-group">
                <label class="form-label" for="reg-gpa">Current GPA (1.00–3.00)</label>
                <input
                  type="number"
                  id="reg-gpa"
                  name="gpa"
                  class="form-input num"
                  step="0.05"
                  min="1.00"
                  max="5.00"
                  value="1.65"
                  inputmode="decimal"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-name">Full Name</label>
              <input
                type="text"
                id="reg-name"
                name="name"
                class="form-input"
                required
                autocomplete="name"
                placeholder="Juan M. Dela Cruz…"
                aria-describedby="reg-name-err"
                aria-errormessage="reg-name-err"
              />
              <span id="reg-name-err" class="field-error-msg">Enter your full legal name.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-program">Degree Program</label>
              <select id="reg-program" name="program" class="form-select" required>
                ${programOptionsHtml}
              </select>
            </div>

            <div class="grid-2" style="gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label" for="reg-college">College</label>
                <input type="text" id="reg-college" name="college" class="form-input" value="CITE" readonly style="background: var(--surface-subtle); font-weight: 700;" />
              </div>
              <div class="form-group">
                <label class="form-label" for="reg-pass">Password</label>
                <div class="password-input-wrap">
                  <input
                    type="password"
                    id="reg-pass"
                    name="newPassword"
                    class="form-input"
                    required
                    minlength="6"
                    autocomplete="new-password"
                    placeholder="Min. 6 characters…"
                    aria-describedby="reg-pass-err"
                    aria-errormessage="reg-pass-err"
                  />
                  <button
                    type="button"
                    class="password-toggle-btn"
                    id="btn-toggle-reg-pass"
                    aria-label="Show password"
                    aria-pressed="false"
                  >
                    ${icon('eye', { size: 16 })}
                  </button>
                </div>
                <span id="reg-pass-err" class="field-error-msg">Use at least 6 characters.</span>
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.68rem;">
              Create Student Account ${icon('arrowRight', { size: 16 })}
            </button>
          </form>

          <!-- TAB 3: EXTERNAL HTE PARTNER -->
          <form id="panel-hte" role="tabpanel" aria-labelledby="tab-btn-hte" hidden novalidate>
            <div class="form-group">
              <label class="form-label" for="hte-invite-token">Partner Invite Token</label>
              <input
                type="text"
                id="hte-invite-token"
                name="inviteToken"
                class="form-input mono"
                required
                autocomplete="off"
                spellcheck="false"
                value="HTE-CSL-2026"
                placeholder="HTE-CSL-2026…"
                aria-describedby="hte-token-hint hte-token-err"
                aria-errormessage="hte-token-err"
              />
              <span id="hte-token-hint" class="form-hint">Demo tokens: <code>HTE-CSL-2026</code>, <code>HTE-GHH-2026</code>, <code>HTE-DICT-2026</code></span>
              <span id="hte-token-err" class="field-error-msg">Enter a valid partner invite token from your OJT Coordinator.</span>
            </div>

            <div class="grid-2" style="gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label" for="hte-sup-name">Supervisor Name</label>
                <input type="text" id="hte-sup-name" name="supervisorName" class="form-input" autocomplete="name" value="Engr. Elena Rostova" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="hte-sup-email">Work Email</label>
                <input type="email" id="hte-sup-email" name="supervisorEmail" class="form-input" autocomplete="email" spellcheck="false" value="supervisor@hte.com" required />
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.68rem;">
              Verify Token &amp; Continue ${icon('arrowRight', { size: 16 })}
            </button>
          </form>

          <!-- DEMO ACCESS PILLS -->
          <div class="demo-pills-box">
            <div class="demo-pills-label">Quick demo sign-in</div>
            <div class="demo-pills-grid">
              <button type="button" class="demo-pill-btn" data-demo-id="student" data-demo-pass="student123">
                ${icon('graduationCap', { size: 14 })} Student (CITE)
              </button>
              <button type="button" class="demo-pill-btn" data-demo-id="coordinator.cite@nemsu.edu.ph" data-demo-pass="coord123">
                ${icon('building', { size: 14 })} CITE Coordinator
              </button>
              <button type="button" class="demo-pill-btn" data-demo-id="coordinator.cbm@nemsu.edu.ph" data-demo-pass="coord123">
                ${icon('building', { size: 14 })} CBM Coordinator
              </button>
              <button type="button" class="demo-pill-btn" data-demo-id="supervisor" data-demo-pass="super123">
                ${icon('briefcase', { size: 14 })} Partner Supervisor
              </button>
              <button type="button" class="demo-pill-btn" data-demo-id="admin" data-demo-pass="admin123">
                ${icon('shieldCheck', { size: 14 })} System Admin
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;

  wirePasswordToggle(
    container.querySelector('#btn-toggle-login-pass'),
    container.querySelector('#login-password')
  );
  wirePasswordToggle(
    container.querySelector('#btn-toggle-reg-pass'),
    container.querySelector('#reg-pass')
  );

  const tabs = [
    { key: 'login', btn: container.querySelector('#tab-btn-login'), panel: container.querySelector('#panel-login') },
    { key: 'register', btn: container.querySelector('#tab-btn-register'), panel: container.querySelector('#panel-register') },
    { key: 'hte', btn: container.querySelector('#tab-btn-hte'), panel: container.querySelector('#panel-hte') }
  ];

  const activateTab = key => {
    tabs.forEach(t => {
      const isCurrent = t.key === key;
      t.btn?.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      if (t.panel) t.panel.hidden = !isCurrent;
    });
  };

  if (initialLoginTab !== 'login') {
    activateTab(initialLoginTab);
    initialLoginTab = 'login';
  }

  tabs.forEach(t => {
    t.btn?.addEventListener('click', () => activateTab(t.key));
  });

  const regProgram = container.querySelector('#reg-program');
  const regCollege = container.querySelector('#reg-college');
  regProgram?.addEventListener('change', () => {
    const selectedOpt = regProgram.options[regProgram.selectedIndex];
    const col = selectedOpt?.getAttribute('data-college') || inferCollegeFromProgram(regProgram.value);
    if (regCollege) regCollege.value = col;
  });

  const loginForm = container.querySelector('#panel-login');
  const idInput = container.querySelector('#login-identifier');
  const passInput = container.querySelector('#login-password');
  const inlineAlert = container.querySelector('#login-inline-alert');
  const authCard = container.querySelector('#auth-card');

  const performLogin = async (identifier, password) => {
    if (inlineAlert) {
      inlineAlert.textContent = '';
      inlineAlert.classList.remove('visible');
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const result = await res.json();

      if (!res.ok || !result.ok) {
        if (inlineAlert) {
          inlineAlert.textContent = result.error || 'Invalid credentials. Check your ID or password and try again.';
          inlineAlert.classList.add('visible');
        }
        triggerShake(authCard);
        showToast({
          title: 'Sign-in failed',
          message: result.error || 'Check your ID and password.',
          type: 'error'
        });
        return;
      }

      await loadInitialDatabase();
      const fullUser = getState().users.find(u => u.id === result.user.id) || result.user;
      setCurrentUser(fullUser);
      showToast({
        title: `Welcome, ${fullUser.name}`,
        message: `Signed in as ${fullUser.role}${fullUser.college ? ` (${fullUser.college})` : ''}.`,
        type: 'success'
      });
      navigateTo(getDefaultRouteForRole(fullUser.role));
    } catch (err) {
      showToast({
        title: 'Connection error',
        message: err.message || 'Could not reach server.',
        type: 'error'
      });
    }
  };

  loginForm?.addEventListener('submit', e => {
    e.preventDefault();
    const idVal = idInput?.value.trim() || '';
    const passVal = passInput?.value.trim() || '';
    if (!idVal) {
      idInput?.setAttribute('aria-invalid', 'true');
      triggerShake(idInput);
      idInput?.focus();
      return;
    }
    if (!passVal) {
      passInput?.setAttribute('aria-invalid', 'true');
      triggerShake(passInput);
      passInput?.focus();
      return;
    }
    performLogin(idVal, passVal);
  });

  container.querySelectorAll('.demo-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const demoId = btn.getAttribute('data-demo-id');
      const demoPass = btn.getAttribute('data-demo-pass');
      if (idInput) idInput.value = demoId;
      if (passInput) passInput.value = demoPass;
      performLogin(demoId, demoPass);
    });
  });

  const regForm = container.querySelector('#panel-register');
  regForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = container.querySelector('#reg-id')?.value.trim();
    const name = container.querySelector('#reg-name')?.value.trim();
    const program = container.querySelector('#reg-program')?.value;
    const college = container.querySelector('#reg-college')?.value;
    const gpa = Number(container.querySelector('#reg-gpa')?.value) || 1.75;
    const pass = container.querySelector('#reg-pass')?.value.trim();

    if (!id || !name || !pass || pass.length < 6) {
      triggerShake(authCard);
      showToast({
        title: 'Missing details',
        message: 'Complete all fields (password minimum 6 characters).',
        type: 'warning'
      });
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name,
          program,
          college,
          gpa,
          pass,
          coursework: NEMSU_COLLEGES[college]?.defaultCoursework || []
        })
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        triggerShake(authCard);
        showToast({ title: 'Sign-up failed', message: result.error || 'Could not register.', type: 'error' });
        return;
      }

      await loadInitialDatabase();
      const newStu = getState().users.find(u => u.id === result.user.id) || result.user;
      setCurrentUser(newStu);
      showToast({
        title: 'Account created',
        message: 'Complete your profile and checklist to prepare for placement.',
        type: 'success'
      });
      navigateTo('#/student/dashboard');
    } catch (err) {
      showToast({ title: 'Server error', message: err.message, type: 'error' });
    }
  });

  const hteForm = container.querySelector('#panel-hte');
  hteForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const inviteToken = container.querySelector('#hte-invite-token')?.value.trim();
    const name = container.querySelector('#hte-sup-name')?.value.trim();
    const email = container.querySelector('#hte-sup-email')?.value.trim();

    if (!inviteToken) {
      triggerShake(authCard);
      showToast({ title: 'Token required', message: 'Enter your partner invite token.', type: 'warning' });
      return;
    }

    try {
      const res = await fetch('/api/auth/supervisor-onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteToken, name, email })
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        triggerShake(authCard);
        showToast({ title: 'Invalid token', message: result.error, type: 'error' });
        return;
      }

      await loadInitialDatabase();
      const supUser = getState().users.find(u => u.id === result.user.id) || result.user;
      setCurrentUser(supUser);
      showToast({
        title: 'Partner verified',
        message: `Signed in for ${supUser.company}.`,
        type: 'success'
      });
      navigateTo('#/supervisor/dashboard');
    } catch (err) {
      showToast({ title: 'Connection error', message: err.message, type: 'error' });
    }
  });
}
