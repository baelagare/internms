import seedDatabase from '../../database.json';
import { readApplicationData, saveApplicationData } from './applicationService.js';
import { authenticate, registerMockStudent, onboardMockSupervisor } from './mockAuth.js';
import { createLaravelAuth } from './laravelAuth.js';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';
const SESSION_KEY = 'internms_active_session_v2';

const remote = () => createLaravelAuth({ baseUrl: API_BASE_URL, storage: sessionStorage, onUnauthorized: () => window.dispatchEvent(new Event('internms:unauthorized')) });

async function localIdentity(remoteUser, registration = {}) {
  const db = await readApplicationData();
  // Never attach an authenticated Laravel user to a seeded demo identity by matching a name or email.
  const id = `laravel:${remoteUser.id}`;
  let user = db.users.find(item => item.id === id);
  if (!user) {
    user = { id, persistence: 'local-profile-for-laravel-account', portfolioData: { skills: [], coursework: [], achievements: [], email: remoteUser.email }, preDeploymentDocs: remoteUser.role === 'student' ? seedDatabase.users.find(item => item.role === 'student').preDeploymentDocs.map(({ id, code, title, issuer }) => ({ id, code, title, issuer, required: true, status: 'Not Uploaded', fileName: null, remarks: '' })) : [], placementStatus: 'Unplaced', clearanceStatus: 'Pre-Deployment', program: registration.program || '', gpa: Number(registration.gpa) || 1.75, section: registration.section || '', disciplinaryClearance: 'Cleared', academicStanding: 'Regular Standing' };
    db.users.push(user);
  }
  Object.assign(user, { backendId: remoteUser.id, studentNumber: remoteUser.identifier_id, name: remoteUser.name, email: remoteUser.email, role: remoteUser.role, college: remoteUser.college || (remoteUser.role === 'admin' ? 'ALL' : undefined) });
  if (remoteUser.role === 'supervisor') user.company = remoteUser.organization;
  await saveApplicationData(db);
  return sanitizeUser(user);
}

function sanitizeUser(user) {
  if (!user) return null;
  const { pass, altPass, password, ...safeUser } = user;
  return safeUser;
}

export const apiConfig = { baseUrl: API_BASE_URL, useMock: USE_MOCK_API };

export async function getDatabase() {
  return readApplicationData();
}

export async function login(identifier, password) {
  if (!USE_MOCK_API) {
    return localIdentity(await remote().login(identifier, password));
  }
  await new Promise(resolve => setTimeout(resolve, 350));
  return authenticate(await readApplicationData(), identifier, password);
}

export async function registerStudent(payload) {
  if (!USE_MOCK_API) {
    return localIdentity(await remote().register(payload), payload);
  }
  const db = await readApplicationData();
  const user = registerMockStudent(db, payload, seedDatabase.users.find(user => user.role === 'student').preDeploymentDocs);
  await saveApplicationData(db);
  return user;
}

export async function onboardSupervisor(payload) {
  if (!USE_MOCK_API) {
    throw new Error('The Laravel backend does not implement invitation-token onboarding. Use a provisioned supervisor account to sign in, or use local demo mode.');
  }
  const db = await readApplicationData();
  const user = onboardMockSupervisor(db, payload);
  await saveApplicationData(db);
  return user;
}

export async function saveDatabase(data) {
  await saveApplicationData(data);
  return { ok: true };
}

export function persistSession(user) {
  if (user) sessionStorage.setItem(SESSION_KEY, user.id);
  else sessionStorage.removeItem(SESSION_KEY);
}

export function getPersistedSessionId() {
  if (!USE_MOCK_API) return null;
  return sessionStorage.getItem(SESSION_KEY);
}

export async function restoreSession() {
  if (USE_MOCK_API) { const id = getPersistedSessionId(); const db = await readApplicationData(); const user = db.users.find(item => item.id === id); return user ? sanitizeUser(user) : null; }
  try { const user = await remote().restore(); return user ? localIdentity(user) : null; }
  catch (error) { if (error.status === 401) return null; throw error; }
}
export async function logoutSession() {
  if (!USE_MOCK_API) await remote().logout();
  persistSession(null);
}
