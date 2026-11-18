import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';
import { useDrawerAccessibility } from '../hooks/useDrawerAccessibility.js';
import './shell.css';

const menus = {
  student: [
    ['dashboard', 'Dashboard', 'grid'],
    ['profile', 'My Profile', 'user'],
    ['checklist', 'Checklist', 'check'],
    ['placement', 'Placement', 'compass'],
    ['attendance', 'Attendance', 'clock'],
    ['tasks', 'Task Logs', 'file'],
    ['messages', 'Messages', 'chat']
  ],
  coordinator: [
    ['dashboard', 'Dashboard', 'grid'],
    ['approvals', 'Approvals', 'check'],
    ['placement', 'Placements', 'compass'],
    ['partners', 'Partners', 'building'],
    ['alerts', 'Risk alerts', 'alert'],
    ['interns', 'Interns', 'users'],
    ['settings', 'Settings', 'settings'],
    ['messages', 'Messages', 'chat']
  ],
  supervisor: [
    ['dashboard', 'Dashboard', 'grid'],
    ['interns', 'Interns', 'users'],
    ['approvals', 'Approvals', 'check'],
    ['postings', 'Job postings', 'building'],
    ['evaluations', 'Evaluations', 'check'],
    ['messages', 'Messages', 'chat']
  ],
  admin: [
    ['dashboard', 'Dashboard', 'grid'],
    ['alerts', 'Risk alerts', 'alert'],
    ['placement', 'Placements', 'compass'],
    ['corpus', 'Policy corpus', 'file'],
    ['audit-logs', 'Audit trail', 'file'],
    ['partners', 'Partners', 'building'],
    ['interns', 'Interns', 'users'],
    ['staff', 'Staff', 'users'],
    ['settings', 'Settings', 'settings'],
    ['messages', 'Messages', 'chat']
  ]
};

const studentPrimaryTabs = [
  ['dashboard', 'Home', 'grid'],
  ['attendance', 'Attendance', 'clock'],
  ['tasks', 'Tasks', 'file'],
  ['messages', 'Messages', 'chat']
];

const labels = {
  student: 'Student',
  coordinator: 'OJT coordinator',
  supervisor: 'Host company representative',
  admin: 'Administrator'
};

const preferenceKey = 'internms_sidebar_collapsed_v1';
function initialCollapsed() {
  try {
    const value = localStorage.getItem(preferenceKey);
    return value == null
      ? window.matchMedia('(min-width: 1024px) and (max-width: 1199px)').matches
      : value === 'true';
  } catch {
    return false;
  }
}

export function AppShell({ user = {}, children, route, onLogout, academicYear, campus, connectionStatus = 'offline' }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const sidebar = useRef(null);
  const content = useRef(null);
  const bottomNav = useRef(null);
  const main = useRef(null);
  const pendingNavigation = useRef(false);
  const previousRoute = useRef(route);
  const closeDrawer = useCallback(() => setOpen(false), []);
  useDrawerAccessibility(open, sidebar, content, closeDrawer, bottomNav);
  useEffect(() => {
    if (previousRoute.current !== route) {
      pendingNavigation.current = true;
      previousRoute.current = route;
      setOpen(false);
      window.scrollTo(0, 0);
    }
    if (!open && pendingNavigation.current) {
      pendingNavigation.current = false;
      main.current?.focus();
    }
  }, [route, open]);
  const roleMenu = Object.hasOwn(menus, user.role) ? menus[user.role] : [];
  const roleLabel = Object.hasOwn(labels, user.role) ? labels[user.role] : 'Workspace';
  const pageLabel = roleMenu.find(([key]) => key === route)?.[1] || 'Workspace';
  useEffect(() => {
    const campusSuffix = campus ? ` · ${campus}` : '';
    document.title = `${pageLabel} · ${roleLabel} · InternMS${campusSuffix}`;
  }, [pageLabel, roleLabel, campus]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(preferenceKey, String(next));
    } catch {
      /* Preference is optional in restricted browsers. */
    }
  };
  const closeForNavigation = () => setOpen(false);
  const isStudent = user.role === 'student';
  const moreActive = isStudent && ['profile', 'checklist', 'placement'].includes(route);

  return (
    <div
      className={`workspace-shell ${collapsed ? 'is-collapsed' : ''} ${open ? 'drawer-open' : ''} ${
        isStudent ? 'has-mobile-tabbar' : ''
      }`}
    >
      <a
        className="workspace-skip"
        href="#main-content"
        onClick={event => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to main content
      </a>
      {/* Backdrop stays mounted: the mobile media query shows it and the
          .drawer-open class on the shell drives its fade, paired with the
          drawer slide (open and close animate together). */}
      <div className="workspace-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
      <aside
        id="workspace-navigation"
        ref={sidebar}
        className="workspace-sidebar"
        aria-label="Workspace navigation"
        tabIndex={-1}
      >
        <div className="workspace-brand">
          <img src="/internms-logo.svg" alt="InternMS logo" />
          <div className="sidebar-label">
            <strong>InternMS</strong>
            <span>NEMSU OJT</span>
          </div>
          <button
            className="shell-icon desktop-toggle"
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            aria-controls="workspace-menu"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon name={collapsed ? 'panelOpen' : 'panelClose'} size={20} />
          </button>
          <button
            className="shell-icon mobile-toggle"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="workspace-account">
          <span className="workspace-avatar" aria-hidden="true">
            {user.name?.trim() ? user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('') : <Icon name="user" size={20} />}
          </span>
          <div className="sidebar-label">
            <strong title={user.name || undefined}>{user.name || 'Account unavailable'}</strong>
            <span title={roleLabel}>{roleLabel}</span>
          </div>
        </div>

        <nav id="workspace-menu" aria-label={`${roleLabel} navigation`}>
          {roleMenu.map(([key, label, icon]) => (
            <a
              key={key}
              href={`#/${user.role}/${key}`}
              aria-label={label}
              aria-current={route === key ? 'page' : undefined}
              onClick={closeForNavigation}
              data-tooltip={label}
            >
              <Icon name={icon} size={20} />
              <span className="sidebar-label">{label}</span>
            </a>
          ))}
        </nav>

        <div className="workspace-logout">
          <button type="button" onClick={onLogout} disabled={!onLogout} aria-label="Sign out" data-tooltip="Sign out">
            <Icon name="logout" size={20} />
            <span className="sidebar-label">Sign out</span>
          </button>
        </div>
      </aside>

      <div ref={content} className="workspace-body">
        <header className="workspace-topbar">
          <button
            className="shell-icon mobile-toggle"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls="workspace-navigation"
          >
            <Icon name="menu" />
          </button>
          <div className="workspace-context">
            <strong>{campus || 'NEMSU Main Campus'}</strong>
            {academicYear && <span>{academicYear}</span>}
          </div>
          <span
            className={`workspace-source ${connectionStatus === 'connected' ? 'workspace-source--connected' : ''}`}
            aria-live="polite"
          >
            {connectionStatus === 'connected' ? 'Connected' : 'Backend not connected'}
          </span>
        </header>

        <main id="main-content" ref={main} tabIndex={-1} aria-label={pageLabel}>
          {children}
        </main>
      </div>

      {isStudent && (
        <nav ref={bottomNav} className="workspace-bottom-nav" aria-label="Primary student navigation">
          {studentPrimaryTabs.map(([key, label, icon]) => (
            <a
              key={key}
              href={`#/student/${key}`}
              aria-current={route === key && !open ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon name={icon} size={20} />
              <span>{label}</span>
            </a>
          ))}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="workspace-navigation"
            className={moreActive || open ? 'is-active' : ''}
            onClick={() => setOpen(prev => !prev)}
          >
            <Icon name="menu" size={20} />
            <span>More</span>
          </button>
        </nav>
      )}
    </div>
  );
}
