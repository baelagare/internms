import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

import { getDatabase } from '../src/services/apiClient.js';
import { allowedRoutes } from '../src/services/routes.js';
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, '.validation');
fs.mkdirSync(output, { recursive: true });
const results = [];
const server = await createServer({ root, cacheDir: path.join(output, 'vite-cache'), optimizeDeps: { noDiscovery: true, include: [] }, logLevel: 'silent', server: { host: '127.0.0.1', port: 5199, strictPort: true } });
try {
  await server.listen();
  for (const route of ['/', '/src/main.jsx', '/internms-logo.svg']) {
    const response = await fetch(`http://127.0.0.1:5199${route}`);
    if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
    results.push({ check: `HTTP ${route}`, passed: true });
  }
  const db = await getDatabase();
  const noChange = () => {};
  const screens = [
    ...['student', 'coordinator', 'supervisor', 'admin'].map(role => ['components/Shell.jsx', 'AppShell', { role }]),
    ['components/Shell.jsx', 'AppShell', {}],
    ['components/Auth.jsx', 'AuthScreen', {}],
    ['components/Registration.jsx', 'Registration', {}],
    ['components/Registration.jsx', 'Registration', { supervisor: true }],
    ['views/StudentDashboard.jsx', 'StudentDashboard', { role: 'student' }],
    ['views/StudentProfile.jsx', 'StudentProfile', { role: 'student' }],
    ['views/StudentChecklist.jsx', 'StudentChecklist', { role: 'student' }],
    ['views/StudentPlacement.jsx', 'StudentPlacement', { role: 'student' }],
    ['views/StudentAttendance.jsx', 'StudentAttendance', { role: 'student' }],
    ['views/Training.jsx', 'Training', { role: 'student' }],
    ['views/Training.jsx', 'NarrativeReportCard', { role: 'student' }],
    ...['coordinator', 'supervisor', 'admin'].flatMap(role => [
      ['views/RoleDashboard.jsx', 'RoleDashboard', { role }],
      ['views/Interns.jsx', 'Interns', { role }],
      ['views/Approvals.jsx', 'Approvals', { role }],
      ['views/Management.jsx', 'Partners', { role }],
      ['views/Messages.jsx', 'Messages', { role }]
    ]),
    ['views/Evaluations.jsx', 'Evaluations', { role: 'supervisor' }],
    ['views/Management.jsx', 'Staff', { role: 'admin' }],
    ['views/Management.jsx', 'Settings', { role: 'admin' }],
    ['views/Management.jsx', 'Settings', { role: 'coordinator', college: 'C1' }],
    ['views/Management.jsx', 'Settings', { role: 'admin', settingsFixture: true }],
    ['views/Management.jsx', 'Settings', { role: 'coordinator', college: 'CAS', settingsFixture: true }],
    ['components/ErrorBoundary.jsx', 'ErrorBoundary', { probe: true }],
    ['views/Management.jsx', 'Corpus', { role: 'admin' }],
    ['views/Governance.jsx', 'Alerts', { role: 'admin' }],
    ['views/Governance.jsx', 'Alerts', { role: 'coordinator' }],
    ['views/Governance.jsx', 'Audit', { role: 'admin' }],
    ['views/Placement.jsx', 'Placement', { role: 'coordinator' }],
    ['views/Messages.jsx', 'Messages', { role: 'student' }]
  ];
  for (const [file, name, user] of screens) {
    try {
      const module = await server.ssrLoadModule(`/src/${file}`);
      if (name === 'ErrorBoundary' && user.probe) {
        const { createElement } = await import('react');
        const { renderToStaticMarkup } = await import('react-dom/server');
        const probeHtml = renderToStaticMarkup(createElement(module.ErrorBoundary, null, createElement('p', null, 'error-boundary-probe-child')));
        if (!probeHtml.includes('error-boundary-probe-child')) throw new Error('ErrorBoundary did not render its children');
        const mainSource = fs.readFileSync(path.join(root, 'src/main.jsx'), 'utf8');
        if (!mainSource.includes("import { ErrorBoundary } from './components/ErrorBoundary.jsx'") || !mainSource.includes('<ErrorBoundary>')) throw new Error('main.jsx does not mount App inside ErrorBoundary');
        results.push({ check: 'ErrorBoundary app root', passed: true });
        continue;
      }
      const { render } = await server.ssrLoadModule('/tests/render.js');
      const renderDb = user.settingsFixture ? { ...db, collegeSettings: { CAS: { requiredHours: 300, maxGpaCutoff: 2.5, ruleAMaxConsecutiveAbsences: 3, ruleAMaxDeficitPct: 20, ruleBConsecutiveWeeks: 2, ruleBClericalKeywords: ['leave', 'excused absence'] } } } : db;
      const renderProps = name === 'Registration' && user.supervisor ? { supervisor: true } : { db: renderDb, user, onChange: noChange, onNavigate: noChange };
      const html = render(module[name], renderProps);
      if (!html) throw new Error('Empty render');
      if (name === 'AppShell') {
        if (!html.includes('Account unavailable') || !html.includes('Skip to main content') || !html.includes('Backend not connected')) throw new Error('Missing shell unavailable state or landmark');
        if (html.includes('#/undefined/')) throw new Error('Invalid role navigation');
        if ((user.role === 'student') !== html.includes('Primary student navigation')) throw new Error('Incorrect mobile navigation scope');
        const sidebarHtml = html.slice(html.indexOf('<aside'), html.indexOf('</aside>'));
        const links = [...sidebarHtml.matchAll(/href="#\/(\w+)\/([^"#]+)"/g)];
        if (user.role && JSON.stringify(links.map(link => link[2])) !== JSON.stringify(allowedRoutes[user.role])) throw new Error('Shell destinations differ from route allowlist');
        if (links.some(link => link[1] !== user.role)) throw new Error('Cross-role shell link');
      }
      if (name === 'StudentDashboard') {
        if (!html.includes('Dashboard unavailable') || html.includes('role="progressbar"') || html.includes('Next step')) throw new Error('Dashboard inferred progress without a student record');
        for (const [state, props, expected] of [
          ['loading', { loading: true }, 'Loading internship overview'],
          ['error', { error: true, onRetry: noChange }, 'Try again'],
          ['missing source', { user: { role: 'student', id: Symbol() } }, 'Dashboard unavailable'],
          ['empty', { user: { role: 'student', id: Symbol() }, db }, 'No evaluation recorded yet.']
        ]) {
          const stateHtml = render(module[name], props);
          if (!stateHtml.includes(expected)) throw new Error(`Dashboard ${state} state missing`);
          if (/NaN|undefined|\b324\b/.test(stateHtml)) throw new Error(`Dashboard ${state} contains invented/invalid values`);
          results.push({ check: `StudentDashboard ${state}`, passed: true });
        }
      }
      if (name === 'AuthScreen') {
        if (!html.includes('Log in to your account') || !html.includes('Choose account type') || !html.includes('Supervisor') || !html.includes('University') || !html.includes('Email address') || !html.includes('Log in as supervisor') || !html.includes('Create your account')) {
          throw new Error('AuthScreen missing supervisor or university sign-in controls');
        }
        if (!html.includes('Privacy Notice') || !html.includes('Terms of Use') || html.includes('<details id="privacy"') || html.includes('<details id="terms"')) {
          throw new Error('AuthScreen footer links are missing or expandable disclosure sections were added');
        }
      }
      if (name === 'Registration' && !user.supervisor) {
        if (!html.includes('Student Account Provisioning') || !html.includes('Return to Sign-In')) {
          throw new Error('Registration missing required student provisioning elements');
        }
      }
      if (name === 'Registration' && user.supervisor) {
        if (!html.includes('Supervisor account setup') || !html.includes('Invitation token') || !html.includes('Create supervisor account')) {
          throw new Error('Supervisor registration missing invitation onboarding fields');
        }
      }
      if (name === 'StudentProfile') {
        if (!html.includes('Official University Identity') || !html.includes('Academic') || !html.includes('Skills') || !html.includes('Résumé / CV') || !html.includes('Achievements')) {
          throw new Error('StudentProfile missing required scannable section headers');
        }
      }
      if (name === 'StudentChecklist') {
        if (!html.includes('Pre-deployment Checklist') || (!html.includes('Required Pre-Deployment Documents') && !html.includes('No required documents assigned') && !html.includes('Document requirements unavailable'))) {
          throw new Error('StudentChecklist missing required checklist landmarks');
        }
      }
      if (name === 'Placement' && user.role === 'coordinator') {
        if (!html.includes('Placement Review') || !html.includes('Student Placement Preferences')) throw new Error('Coordinator placement landmarks missing');
        if (!html.includes('AI Placement Recommendations') || !html.includes('% Match')) throw new Error('Coordinator placement ranking preview missing');
      }
      if (name === 'Placement' && user.role === 'admin') {
        if (!html.includes('Placement Management') || !html.includes('Placement Records')) throw new Error('Admin placement landmarks missing');
        if (/cosine/.test(html)) throw new Error('Admin placement shows fabricated ranking fields');
      }
      if (name === 'Corpus' && user.role === 'admin') {
        if (!html.includes('Policy Corpus') && !html.includes('Policy corpus')) throw new Error('Admin policy corpus landmarks missing');
        if (html.includes('[PLACEHOLDER]') || html.includes('Index status')) throw new Error('Policy corpus shows stale placeholder or index content');
      }
      if (name === 'StudentPlacement') {
        if (!html.includes('Placement Management') || !html.includes('Current Assignment Status') || !html.includes('Placement Eligibility')) {
          throw new Error('StudentPlacement missing required placement landmarks');
        }
      }

      if (name === 'Alerts' && user.role === 'coordinator') {
        if (!html.includes('Risk Alerts') || !html.includes('Needs Review') || !html.includes('Early-Warning Risk Detection')) throw new Error('Coordinator alert landmarks missing');
      }
      if (name === 'Audit' && user.role === 'admin') {
        if (!html.includes('Audit Trail') || !html.includes('Authoritative audit records are unavailable') || (!html.includes('No audit events recorded yet') && !html.includes('Audit records') && !html.includes('Audit Records'))) throw new Error('Admin audit trail landmarks missing');
        if (html.includes('Event ID') || html.includes('Timestamp') || html.includes('Object.entries')) throw new Error('Audit trail exposes raw field names');
      }
      if (name === 'Partners' && user.role === 'supervisor') {
        if (!html.includes('Job Postings') || !html.includes('Role Information') || !html.includes('Capacity, eligibility rules, and placement decisions are managed separately')) throw new Error('Host job posting landmarks missing');
        if (html.includes('Maximum slots') || html.includes('GPA cutoff')) throw new Error('Host job posting exposes institutional controls');
      }
      if (name === 'Partners' && user.role === 'coordinator') {
        if (!html.includes('Partner Companies') || !html.includes('Partner Directory') || !html.includes('Invitations Pending')) throw new Error('Coordinator partner landmarks missing');
      }
      if (name === 'Partners' && user.role === 'admin') {
        if (!html.includes('Manage host company records across all colleges') || !html.includes('College Scope') || !html.includes('Colleges Covered')) throw new Error('Admin partner landmarks missing');
        if (!html.includes('No partner records yet') && !html.includes('Partner Directory')) throw new Error('Admin partner empty state missing');
      }
      if (name === 'Approvals' && user.role === 'supervisor') {
        if (!html.includes('Company review queue') || !html.includes('Needs your review') || !html.includes('Final OJT credit is decided by the college coordinator')) throw new Error('Host approval review landmarks missing');
      }
      if (name === 'Approvals' && user.role === 'coordinator') {
        if (!html.includes('Coordinator approvals') || !html.includes('Needs review') || !html.includes('Approved / verified')) throw new Error('Coordinator approvals landmarks missing');
      }
      if (name === 'Settings' && user.role === 'coordinator') {
        if (!html.includes('College settings') || (!html.includes('Settings unavailable') && !html.includes('Academic requirements'))) throw new Error('Coordinator settings landmarks missing');
      }
      if (name === 'Settings' && user.role === 'admin') {
        if (!html.includes('College settings') || !html.includes('across all colleges')) throw new Error('Admin settings landmarks missing');
        if (!html.includes('Colleges with saved settings') && !html.includes('Settings unavailable')) throw new Error('Admin settings coverage or unavailable state missing');
      }
      if (name === 'Settings' && user.settingsFixture) {
        if (!html.includes('Academic requirements') || !html.includes('Attendance thresholds') || !html.includes('Task review threshold') || !html.includes('Save settings') || !html.includes('Flagged non-degree clerical terms')) throw new Error('Settings form landmarks missing for populated college settings');
      }
      if (name === 'Staff' && user.role === 'admin') {
        if (!html.includes('Staff accounts') || !html.includes('OJT coordinators') || !html.includes('Host representatives')) throw new Error('Admin staff landmarks missing');
        if (html.includes('label="Invitation token"') || html.includes('College code or exact partner company name')) throw new Error('Staff screen exposes raw tokens or recall-based scope input');
      }
      if (name === 'Evaluations' && user.role === 'supervisor') {
        if (!html.includes('Performance evaluations') || (!html.includes('No assigned interns') && !html.includes('Select intern to evaluate'))) {
          throw new Error('Host evaluations landmarks missing');
        }
      }
      if (name === 'Interns' && user.role === 'supervisor') {
        if (!html.includes('Assigned Interns') || (!html.includes('Intern Records Unavailable') && (!html.includes('Waiting on you') || !html.includes('Host A')))) throw new Error('Host representative intern directory landmarks missing');
        if (html.includes('Clearance') || html.includes('Score / 95')) throw new Error('Host representative intern screen leaks institutional-only details');
      }
      if (name === 'Interns' && user.role === 'coordinator') {
        if (!html.includes('Intern directory') || !html.includes('Students in scope') || !html.includes('Search students') || !html.includes('Student records')) throw new Error('Coordinator intern directory landmarks missing');
      }
      if (name === 'Interns' && user.role === 'admin') {
        if (!html.includes('Intern directory') || !html.includes('Student records across all colleges') || !html.includes('Students in scope') || !html.includes('College')) throw new Error('Admin intern directory landmarks missing');
        if (!html.includes('No student records yet') && !html.includes('Student records')) throw new Error('Admin intern empty state missing');
      }
      if (name === 'RoleDashboard' && user.role === 'supervisor') {
        if (!html.includes('Company Dashboard') || (!html.includes('Company Records Unavailable') && (!html.includes('Review Work') || !html.includes('Assigned Interns')))) throw new Error('Host representative dashboard landmarks missing');
      }
      if (name === 'RoleDashboard' && user.role === 'coordinator') {
        if (!html.includes('Coordinator Dashboard') || (!html.includes('Dashboard Data Unavailable') && (!html.includes('Review Queue') || !html.includes('Cohort Overview')))) throw new Error('Coordinator dashboard landmarks missing');
      }
      if (name === 'RoleDashboard' && user.role === 'admin') {
        if (!html.includes('Administrator Dashboard') || (!html.includes('Administration Data Unavailable') && (!html.includes('Administrative Tools') || !html.includes('College Compliance Summary')))) throw new Error('Admin dashboard landmarks missing');
      }
      if (name === 'Messages') {
        const coordinatorNotice = 'Messages are read-only until the backend is connected.';
        if (!html.includes('Messages') || !html.includes('Contacts') || (user.role === 'coordinator' ? !html.includes('Messages are read-only until the backend is connected') : !html.includes('Sending is unavailable until the backend is connected.'))) {
          throw new Error('Messages missing conversation landmarks or backend availability notice');
        }
        if (html.includes('calc(100dvh')) throw new Error('Messages uses a hardcoded viewport-height calculation');
      }
      if (name === 'Messages' && user.role === 'admin') {
        if (!html.includes('University-wide messaging directory') || !html.includes('OJT coordinators') || !html.includes('Student interns')) throw new Error('Admin messages directory landmarks missing');
      }
      if (name === 'StudentAttendance') {
        if (!html.includes('Daily Time In &amp; Out') || !html.includes('OJT Hours Summary') || !html.includes('Daily Time Record (DTR)')) {
          throw new Error('StudentAttendance missing required attendance landmarks');
        }
      }
      if (name === 'Training') {
        if (!html.includes('Task Logs &amp; Narrative') || !html.includes('Submit Weekly Accomplishment Report') || !html.includes('Submitted weekly reports')) {
          throw new Error('Training missing required task logs landmarks');
        }
      }
      if (name === 'NarrativeReportCard') {
        if (!html.includes('OJT Narrative &amp; Competency Report') || !html.includes('Preview &amp; Print Report')) {
          throw new Error('NarrativeReportCard missing required narrative report landmarks');
        }
      }



      results.push({ check: `${name} ${user.role || 'public'}`, passed: true });
    } catch (error) { results.push({ check: `${name} ${user.role || 'public'}`, passed: false, error: error.stack }); }
  }
} catch (error) { results.push({ check: 'runtime', passed: false, error: error.stack }); }
finally {
  await server.close();
  fs.writeFileSync(path.join(output, 'smoke.json'), JSON.stringify(results, null, 2));
}
console.log(`${results.filter(r => r.passed).length}/${results.length} checks passed`);
// The short-lived CLI owns this Vite server; release Vite's remaining worker handles.
process.exit(results.some(r => !r.passed) ? 1 : 0);
