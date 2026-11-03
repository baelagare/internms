import {
  getState,
  loadInitialDatabase,
  setCurrentUser,
  getScopedAlerts,
  getScopedLogs,
  getSupervisorScopedInterns
} from './state/store.js';
import { initHashRouter, navigateTo, getCurrentRoute } from './router/hashRouter.js';
import { renderLandingPage, renderAuthGateway } from './modules/auth/authView.js';
import { renderStudentWorkspace } from './modules/student/studentView.js';
import { renderCoordinatorWorkspace } from './modules/coordinator/coordinatorView.js';
import { renderSupervisorWorkspace } from './modules/supervisor/supervisorView.js';
import { renderAdminWorkspace } from './modules/admin/adminView.js';
import { showToast } from './components/ui/ToastManager.js';
import { icon } from './components/ui/Icons.js';
import { LOGOS, esc, initials } from './utils/html.js';

const SIDEBAR_STORAGE_KEY = 'internms_sidebar_collapsed';

// Feature-detect Popover API per Modern Web Guidance (`persistent-toast-notifications`)
if (typeof HTMLElement !== 'undefined' && !('popover' in HTMLElement.prototype)) {
  import('https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover.min.js').catch(() => {});
}

// Accessible Error Announcement Synchronizer (:user-invalid -> aria-invalid="true")
function initAccessibleErrorAnnouncement() {
  const supportsUserInvalid = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('selector(:user-invalid)');
  const dirtyState = new WeakMap();

  const syncAriaInvalid = input => {
    if (!input || !input.matches?.('input, textarea, select')) return;
    const isInvalid = supportsUserInvalid ? input.matches(':user-invalid') : !input.checkValidity();
    if (!supportsUserInvalid) {
      input.classList.toggle('user-invalid-fallback', isInvalid);
    }
    if (isInvalid) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  };

  document.addEventListener(
    'blur',
    e => {
      const input = e.target;
      if (!input?.matches?.('input, textarea, select')) return;
      const st = dirtyState.get(input) || { interacted: false };
      if (supportsUserInvalid || st.interacted) {
        syncAriaInvalid(input);
      }
    },
    true
  );

  document.addEventListener('input', e => {
    const input = e.target;
    if (!input?.matches?.('input, textarea, select')) return;
    dirtyState.set(input, { interacted: true });
    if (input.getAttribute('aria-invalid') === 'true') {
      syncAriaInvalid(input);
    }
  });
}

function getSidebarCollapsedPreference() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function setSidebarCollapsedPreference(collapsed) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? 'true' : 'false');
  } catch {
    // ignore storage errors
  }
}

function getNavigationConfig(user) {
  const state = getState();
  if (!user) return { badge: '', items: [] };

  if (user.role === 'student') {
    const vDocs = (user.preDeploymentDocs || []).filter(d => d.status === 'Verified').length;
    return {
      badge: `Student · ${user.college || 'CITE'}`,
      items: [
        { route: '#/student/dashboard', label: 'Dashboard', icon: 'layoutDashboard' },
        { route: '#/student/profile', label: 'My Profile', icon: 'user' },
        { route: '#/student/checklist', label: 'Checklist', icon: 'clipboardCheck', count: `${vDocs}/5` },
        { route: '#/student/placement', label: 'Placements', icon: 'compass' },
        { route: '#/student/attendance', label: 'Attendance', icon: 'clock' },
        { route: '#/student/tasks', label: 'Task Logs', icon: 'fileText' },
        { route: '#/student/messages', label: 'Messages', icon: 'message' }
      ]
    };
  }

  if (user.role === 'coordinator') {
    const alertsCount = getScopedAlerts(user.college).length;
    const logsCount = getScopedLogs(user.college).filter(l => l.status !== 'Coordinator Approved').length;
    return {
      badge: `Coordinator · ${user.college}`,
      items: [
        { route: '#/coordinator/dashboard', label: 'Dashboard', icon: 'layoutDashboard' },
        { route: '#/coordinator/approvals', label: 'Approvals', icon: 'clipboardCheck', count: logsCount || '' },
        { route: '#/coordinator/placement', label: 'Placements', icon: 'compass' },
        { route: '#/coordinator/partners', label: 'Partners', icon: 'building' },
        { route: '#/coordinator/alerts', label: 'Risk Alerts', icon: 'alert', count: alertsCount || '' },
        { route: '#/coordinator/interns', label: 'Interns', icon: 'graduationCap' },
        { route: '#/coordinator/settings', label: 'Settings', icon: 'settings' },
        { route: '#/coordinator/messages', label: 'Messages', icon: 'message' }
      ]
    };
  }

  if (user.role === 'supervisor') {
    const internCount = getSupervisorScopedInterns().length;
    return {
      badge: 'Partner Supervisor',
      items: [
        { route: '#/supervisor/dashboard', label: 'Dashboard', icon: 'layoutDashboard' },
        { route: '#/supervisor/interns', label: 'Interns', icon: 'graduationCap', count: internCount },
        { route: '#/supervisor/approvals', label: 'Approvals', icon: 'clipboardCheck' },
        { route: '#/supervisor/postings', label: 'Job Postings', icon: 'briefcase' },
        { route: '#/supervisor/evaluations', label: 'Evaluations', icon: 'award' },
        { route: '#/supervisor/messages', label: 'Messages', icon: 'message' }
      ]
    };
  }

  return {
    badge: 'System Admin',
    items: [
      { route: '#/admin/dashboard', label: 'Dashboard', icon: 'layoutDashboard' },
      { route: '#/admin/alerts', label: 'Risk Alerts', icon: 'alert', count: state.alerts.length },
      { route: '#/admin/placement', label: 'Placements', icon: 'compass' },
      { route: '#/admin/corpus', label: 'Policy Corpus', icon: 'bookOpen', count: state.policyCorpus.length },
      { route: '#/admin/audit-logs', label: 'Audit Trail', icon: 'history', count: state.auditLogs.length },
      { route: '#/admin/partners', label: 'Partners', icon: 'building' },
      { route: '#/admin/interns', label: 'Interns', icon: 'graduationCap' },
      { route: '#/admin/staff', label: 'Staff', icon: 'users' },
      { route: '#/admin/settings', label: 'Settings', icon: 'settings' },
      { route: '#/admin/messages', label: 'Messages', icon: 'message' }
    ]
  };
}

function renderApplicationRoute(route) {
  const appRoot = document.getElementById('app-root');
  if (!appRoot) return;

  const state = getState();
  const user = state.currentUser;

  if (!user && route === '#/') {
    renderLandingPage(appRoot);
    return;
  }

  if (!user || route === '#/login') {
    renderAuthGateway(appRoot);
    return;
  }

  const navConfig = getNavigationConfig(user);
  const currentRoute = getCurrentRoute();
  const parts = currentRoute.replace(/^#\//, '').split('/');
  const subRoute = parts[1] || 'dashboard';
  const activeNavItem = navConfig.items.find(i => i.route === currentRoute) || navConfig.items[0];
  const isCollapsed = getSidebarCollapsedPreference();

  appRoot.innerHTML = `
    <a href="#workspace-view-mount" class="skip-link">Skip to main content</a>
    <div class="app-shell ${isCollapsed ? 'sidebar-collapsed' : ''}" id="app-shell">
      <div class="sidebar-backdrop" id="sidebar-backdrop" hidden></div>

      <aside class="app-sidebar ${isCollapsed ? 'collapsed' : ''}" id="app-sidebar" aria-label="Workspace Navigation">
        <div class="sidebar-brand">
          <img
            src="${LOGOS.seal}"
            alt="NEMSU Seal"
            class="sidebar-brand-seal"
            width="36"
            height="36"
            fetchpriority="high"
          />
          <div class="brand-meta">
            <strong class="brand-wordmark" translate="no">InternMS</strong>
            <span>NEMSU Main Campus</span>
          </div>
          <button
            type="button"
            class="sidebar-collapse-btn"
            id="btn-collapse-sidebar"
            aria-label="${isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}"
            title="${isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}"
          >
            ${icon(isCollapsed ? 'panelLeftOpen' : 'panelLeftClose', { size: 17 })}
          </button>
        </div>

        <div class="sidebar-workspace-badge">
          ${esc(navConfig.badge)}
        </div>

        <nav class="sidebar-nav" aria-label="${esc(navConfig.badge)} Navigation">
          ${navConfig.items
            .map(
              item => `
            <a
              href="${item.route}"
              class="nav-item-link"
              data-tooltip="${esc(item.label)}"
              aria-label="${esc(item.label)}"
              ${item.route === currentRoute ? 'aria-current="page"' : ''}
            >
              <span class="nav-item-left">
                ${icon(item.icon, { size: 17, className: 'nav-item-icon' })}
                <span class="nav-item-label">${esc(item.label)}</span>
              </span>
              ${item.count !== undefined && item.count !== '' ? `<span class="nav-item-count">${esc(String(item.count))}</span>` : ''}
            </a>
          `
            )
            .join('')}
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-user-card" title="${esc(user.name)}">
            <div class="user-avatar" aria-hidden="true">
              ${esc(initials(user.name))}
            </div>
            <div class="user-meta">
              <strong>${esc(user.name)}</strong>
              <span>${esc(user.title || user.program || user.company || user.role.toUpperCase())}</span>
            </div>
          </div>

          <button
            type="button"
            class="btn btn-sm btn-danger-outline sidebar-logout-btn"
            id="btn-logout"
            data-tooltip="Sign Out"
            aria-label="Sign Out"
            title="Sign Out"
          >
            ${icon('logOut', { size: 16 })}
            <span class="logout-label">Sign Out</span>
          </button>
        </div>
      </aside>

      <div class="app-main">
        <header class="app-topbar">
          <div class="topbar-left">
            <button type="button" class="mobile-menu-btn" id="btn-mobile-menu" aria-label="Open navigation menu" aria-expanded="false">
              ${icon('menu', { size: 18 })}
            </button>
            <div class="topbar-title-group">
              <h1 class="topbar-crumb">${esc(activeNavItem?.label || 'Workspace')}</h1>
              <p>
                ${
                  user.role === 'supervisor'
                    ? `${esc(user.company)} · Partner Workspace`
                    : user.role === 'admin'
                    ? `University Administration · Scope: ${esc(state.adminCollegeFilter || 'ALL')}`
                    : `${esc(user.college || 'CITE')} · ${esc(user.program || user.title || '')}`
                }
              </p>
            </div>
          </div>

          <div class="topbar-right">
            <span class="academic-year-pill">
              <img src="${LOGOS.seal}" alt="" width="18" height="18" style="border-radius: 50%;" />
              <span>${esc(state.academicYear)} · ${esc(state.campus)}</span>
            </span>
          </div>
        </header>

        <main class="app-content" id="workspace-view-mount" tabindex="-1"></main>
      </div>
    </div>
  `;

  const shell = appRoot.querySelector('#app-shell');
  const sidebar = appRoot.querySelector('#app-sidebar');
  const collapseBtn = appRoot.querySelector('#btn-collapse-sidebar');
  const mobileMenuBtn = appRoot.querySelector('#btn-mobile-menu');
  const backdrop = appRoot.querySelector('#sidebar-backdrop');

  // Desktop Collapsible Sidebar Rail Toggle
  collapseBtn?.addEventListener('click', () => {
    const nextCollapsed = !shell?.classList.contains('sidebar-collapsed');
    shell?.classList.toggle('sidebar-collapsed', nextCollapsed);
    sidebar?.classList.toggle('collapsed', nextCollapsed);
    setSidebarCollapsedPreference(nextCollapsed);
    collapseBtn.setAttribute('aria-label', nextCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    collapseBtn.setAttribute('title', nextCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    collapseBtn.innerHTML = icon(nextCollapsed ? 'panelLeftOpen' : 'panelLeftClose', { size: 17 });
  });

  // Mobile Drawer Open/Close with Backdrop & Escape key
  const closeMobileDrawer = () => {
    sidebar?.classList.remove('mobile-open');
    if (backdrop) backdrop.hidden = true;
    mobileMenuBtn?.setAttribute('aria-expanded', 'false');
  };

  mobileMenuBtn?.addEventListener('click', () => {
    const isOpen = sidebar?.classList.toggle('mobile-open');
    if (backdrop) backdrop.hidden = !isOpen;
    mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  backdrop?.addEventListener('click', closeMobileDrawer);

  // Sign Out Handler
  appRoot.querySelector('#btn-logout')?.addEventListener('click', () => {
    setCurrentUser(null);
    showToast({
      title: 'Signed out',
      message: 'You have been signed out of InternMS.',
      type: 'info',
      durationMs: 2500
    });
    navigateTo('#/', true);
  });

  // Mount Role-Scoped View
  const viewMount = appRoot.querySelector('#workspace-view-mount');
  if (!viewMount) return;

  if (user.role === 'student') {
    renderStudentWorkspace(viewMount, subRoute);
  } else if (user.role === 'coordinator') {
    renderCoordinatorWorkspace(viewMount, subRoute);
  } else if (user.role === 'supervisor') {
    renderSupervisorWorkspace(viewMount, subRoute);
  } else if (user.role === 'admin') {
    renderAdminWorkspace(viewMount, subRoute);
  }
}

export async function bootstrapApp() {
  initAccessibleErrorAnnouncement();
  try {
    await loadInitialDatabase();
  } catch (err) {
    console.error('Database bootstrap error:', err);
  }
  initHashRouter(route => {
    renderApplicationRoute(route);
  });
}

bootstrapApp();
