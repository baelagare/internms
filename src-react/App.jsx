import { useEffect, useMemo, useState } from 'react';
import { AuthScreen } from './components/auth.jsx';
import { Registration } from './components/Registration.jsx';
import { AppShell } from './components/Shell.jsx';
import { RoleDashboard as Dashboard } from './views/RoleDashboard.jsx';
import { StudentProfile } from './views/StudentProfile.jsx';
import { StudentChecklist } from './views/StudentChecklist.jsx';
import { StudentAttendance } from './views/StudentAttendance.jsx';
import { Messages } from './views/Messages.jsx';
import { Placement } from './views/Placement.jsx';
import { Training } from './views/Training.jsx';
import { Approvals } from './views/Approvals.jsx';
import { Evaluations } from './views/Evaluations.jsx';
import { Interns } from './views/Interns.jsx';
import { Partners, Staff, Settings, Corpus } from './views/Management.jsx';
import { Alerts, Audit } from './views/Governance.jsx';
import { allowedRoutes } from './services/routes.js';
import { getDatabase, restoreSession, logoutSession, login, onboardSupervisor, persistSession, registerStudent, apiConfig } from './services/apiClient.js';

function readRoute() { const value = window.location.hash.replace(/^#\/?/, ''); const [role, route = 'dashboard'] = value.split('/'); return { role, route }; }

export default function App() {
  const [db, setDb] = useState(null);
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState(readRoute());
  const [busy, setBusy] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  useEffect(() => { const onHashChange = () => setRoute(readRoute()); window.addEventListener('hashchange', onHashChange); return () => window.removeEventListener('hashchange', onHashChange); }, []);
  useEffect(() => { let active = true; (async () => { const savedUser = await restoreSession(); const data = await getDatabase(); if (active) { setDb(data); setUser(savedUser); if (savedUser && ['login', 'register', ''].includes(readRoute().role || '')) window.location.hash = `#/${savedUser.role}/dashboard`; } })().catch(err => active && setError(err.message)).finally(() => active && setBusy(false)); return () => { active = false; }; }, []);
  useEffect(() => { const expired = () => { setUser(null); setError('Your authentication token is no longer valid. Sign in again.'); window.location.hash = '#/login'; }; window.addEventListener('internms:unauthorized', expired); return () => window.removeEventListener('internms:unauthorized', expired); }, []);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(null), 4200); return () => clearTimeout(timer); } }, [toast]);
  const notify = (title, message, tone = 'success') => setToast({ title, message, tone });
  const enter = async nextUser => { const data = await getDatabase(); setDb(data); setUser(nextUser); persistSession(nextUser); window.location.hash = `#/${nextUser.role}/dashboard`; notify(`Welcome, ${nextUser.name.split(' ')[0]}`, `You are signed in as ${nextUser.role}.`); };
  const handleLogin = async (identifier, password) => { setAuthBusy(true); setError(''); try { await enter(await login(identifier, password)); } catch (err) { setError(err.message); } finally { setAuthBusy(false); } };
  const handleRegister = async form => { setAuthBusy(true); setError(''); try { const nextUser = await registerStudent({ ...form, id: form.identifier }); await enter(nextUser); } catch (err) { setError(err.message); } finally { setAuthBusy(false); } };
  const handleSupervisor = async form => { setAuthBusy(true); setError(''); try { await enter(await onboardSupervisor(form)); } catch (err) { setError(err.message); } finally { setAuthBusy(false); } };
  const logout = async () => { try { await logoutSession(); setUser(null); window.location.hash = '#/login'; notify('Signed out', apiConfig.useMock ? 'Your local session has been cleared.' : 'Laravel token revoked.', 'info'); } catch (error) { notify('Sign-out failed', error.message, 'info'); } };
  const navigate = key => { window.location.hash = `#/${user.role}/${key}`; };
  const updateData = next => { setDb(next); setUser(previous => { const refreshed = next.users.find(candidate => candidate.id === previous?.id); if (!refreshed) return previous; const { pass, altPass, password, ...safe } = refreshed; return safe; }); };
  const isPublic = !user;
  const content = useMemo(() => {
    if (!db || !user) return null;
    if (route.role !== user.role || !allowedRoutes[user.role]?.includes(route.route)) return <section role="alert" className="rounded-xl border bg-white p-6"><h1 className="text-xl font-bold">Page unavailable for your role</h1><p className="my-3">Choose a destination from your navigation.</p><button onClick={() => navigate('dashboard')} className="font-bold text-navy-700">Return to dashboard</button></section>;
    if (route.route === 'dashboard') return <Dashboard user={user} db={db} onNavigate={navigate}/>;
    if (route.route === 'messages') return <Messages key={user.id} user={user} db={db} onChange={updateData}/>;
    if (route.route === 'placement') return <Placement key={user.id} user={user} db={db} onChange={updateData}/>;
    if (user.role === 'student' && route.route === 'attendance') return <StudentAttendance key={user.id} user={user} db={db} onChange={updateData}/>;
    if (route.route === 'attendance' || route.route === 'tasks') return <Training key={`${user.id}-${route.route}`} user={user} db={db} onChange={updateData} route={route.route}/>;
    if (route.route === 'approvals') return <Approvals key={user.id} user={user} db={db} onChange={updateData}/>;
    if (route.route === 'evaluations') return <Evaluations key={user.id} user={user} db={db} onChange={updateData}/>;
    if (route.route === 'interns') return <Interns key={user.id} user={user} db={db} onChange={updateData}/>;
    if (route.route === 'alerts') return <Alerts key={user.id} user={user} db={db} onChange={updateData}/>;
    if (route.route === 'audit-logs') return <Audit db={db}/>;
    if (['partners', 'postings', 'staff', 'settings', 'corpus'].includes(route.route)) { const View = { partners: Partners, postings: Partners, staff: Staff, settings: Settings, corpus: Corpus }[route.route]; return <View key={`${user.id}-${route.route}`} user={user} db={db} onChange={updateData}/>; }
    if (user.role === 'student' && route.route === 'profile') return <StudentProfile key={user.id} user={user} onChange={updateData}/>;
    if (user.role === 'student' && route.route === 'checklist') return <StudentChecklist user={user} onChange={updateData}/>;
    return <section role="alert">Unknown destination. Choose a page from the navigation.</section>;
  }, [db, user, route]);
  if (busy) return <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-canvas p-6"><div className="text-center"><img src="/internms-logo.svg" alt="" className="mx-auto h-16 w-16 rounded-full" /><p className="mt-4 text-sm font-bold text-navy-900">Loading your workspace…</p><p className="mt-1 text-xs text-slate-500">Restoring your session and local application records</p></div></div>;
  if (!db && error) return <main className="mx-auto max-w-lg p-8"><section role="alert" className="rounded-xl border border-red-200 bg-white p-6"><h1 className="text-xl font-bold">Workspace could not be loaded</h1><p className="my-4 text-sm">{error}</p><p className="mb-4 text-sm text-slate-600">Your records have not been reset. Check your connection or browser storage settings and try again.</p><button className="rounded-lg bg-navy-900 px-4 py-3 text-sm font-bold text-white" onClick={() => window.location.reload()}>Retry loading workspace</button></section></main>;
  if (isPublic) return <>{route.role === 'register' ? <Registration onRegister={handleRegister} busy={authBusy} error={error}/> : <AuthScreen onLogin={handleLogin} onRegister={() => { window.location.hash = '#/register'; }} onSupervisorOnboard={handleSupervisor} busy={authBusy} error={error} />}{toast && <Toast toast={toast} />}</>;
  return <><AppShell user={user} academicYear={db?.academicYear} route={route.route} onLogout={logout}>{content}</AppShell>{toast && <Toast toast={toast} />}</>;
}

function Toast({ toast }) { return <div role="status" aria-live="polite" className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border bg-white p-4 shadow-xl ${toast.tone === 'info' ? 'border-blue-200' : 'border-emerald-200'}`}><p className="text-sm font-extrabold text-slate-900">{toast.title}</p><p className="mt-1 text-xs text-slate-600">{toast.message}</p></div>; }
