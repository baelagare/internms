import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons.jsx';
import { useDrawerAccessibility } from './useDrawerAccessibility.js';
import { apiConfig } from '../services/apiClient.js';
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
  coordinator: 'College coordinator',
  supervisor: 'Partner supervisor',
  admin: 'System administrator'
};

const preferenceKey = 'internms_sidebar_collapsed_v1';
function initialCollapsed() {
  try {
    const value = localStorage.getItem(preferenceKey);
    return value == null
      ? window.matchMedia('(min-width: 768px) and (max-width: 1100px)').matches
      : value === 'true';
  } catch {
    return false;
  }
}

export function AppShell({ user, children, route, onLogout, academicYear }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const sidebar = useRef(null);
  const content = useRef(null);
  useDrawerAccessibility(open, sidebar, content, () => setOpen(false));
  useEffect(() => setOpen(false), [route]);

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
      {open && (
        <div className="workspace-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
      )}
      <aside
        id="workspace-navigation"
        ref={sidebar}
        className="workspace-sidebar"
        aria-label="Workspace navigation"
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
            {user.name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map(part => part[0])
              .join('')}
          </span>
          <div className="sidebar-label">
            <strong title={user.name}>{user.name}</strong>
            <span>{user.program || user.college || labels[user.role]}</span>
          </div>
        </div>

        <nav id="workspace-menu" aria-label={`${labels[user.role]} navigation`}>
          {menus[user.role].map(([key, label, icon]) => (
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
          <button onClick={onLogout} aria-label="Sign out" data-tooltip="Sign out">
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
            <strong>NEMSU Main Campus</strong>
            {academicYear && <span>{academicYear}</span>}
          </div>
          <span className="workspace-source">
            {apiConfig.useMock ? 'Demo mode: saved on this device' : 'Saved on this device'}
          </span>
        </header>

        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      {isStudent && (
        <nav className="workspace-bottom-nav" aria-label="Primary student navigation">
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
