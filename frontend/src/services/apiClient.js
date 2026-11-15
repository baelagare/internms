import { normalizeWorkspace } from './workspaceAdapter.js';

const emptyDatabase = () => ({
  academicYear: null,
  campus: null,
  users: [],
  htes: [],
  collegeSettings: {},
  policyCorpus: [],
  logs: [],
  dtrDisputes: [],
  alerts: [],
  evaluations: [],
  auditLogs: [],
  messages: [],
  documents: []
});

const rawBaseUrl = ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'http://localhost:8000/api/v1').replace(/\/$/, '');
const API_BASE_URL = rawBaseUrl.endsWith('/api/v1') ? rawBaseUrl : `${rawBaseUrl}/api/v1`;
const TOKEN_KEY = 'internms_access_token';
const USER_KEY = 'internms_user';

export function getApiBaseUrl() {
  return API_BASE_URL;
}

function getToken() {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(TOKEN_KEY);
}

function storeAuth(payload) {
  if (typeof sessionStorage === 'undefined') return;
  if (payload?.token) sessionStorage.setItem(TOKEN_KEY, payload.token);
  if (payload?.user) sessionStorage.setItem(USER_KEY, JSON.stringify(payload.user));
}

function clearAuth() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(`The backend could not be reached at ${API_BASE_URL}. Start Laravel and try again.`);
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (response.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('internms:unauthorized'));
  }
  if (!response.ok) {
    const errors = payload?.errors ? Object.values(payload.errors).flat().join(' ') : '';
    throw new Error([payload?.message || `Request failed with status ${response.status}.`, errors].filter(Boolean).join(' '));
  }
  return payload;
}

export async function apiRequest(path, options = {}) {
  const body = options.body instanceof FormData || typeof options.body === 'string' || options.body == null
    ? options.body
    : JSON.stringify(options.body);
  return request(path, { ...options, body });
}

export async function getDatabase() {
  if (!getToken()) return emptyDatabase();
  return normalizeWorkspace(await apiRequest('/workspace'));
}

export async function login(identifier, password) {
  const payload = await apiRequest('/auth/login', { method: 'POST', body: { email: identifier, password } });
  storeAuth(payload);
  return payload.user;
}

export async function loginWithGoogle(idToken) {
  const payload = await apiRequest('/auth/google', { method: 'POST', body: { idToken } });
  storeAuth(payload);
  return payload.user;
}

export async function registerStudent(form = {}) {
  if (form.idToken) return loginWithGoogle(form.idToken);
  throw new Error('Student accounts are created through institutional Google Sign-In.');
}

export async function onboardSupervisor(form) {
  const payload = await apiRequest('/auth/supervisor-invite', {
    method: 'POST',
    body: {
      inviteToken: form.inviteToken,
      name: form.name,
      email: form.email,
      password: form.password
    }
  });
  storeAuth(payload);
  return payload.user;
}

export async function saveDatabase() {
  throw new Error('Bulk database writes are not supported. Use the resource endpoint for the specific operation.');
}

export function persistSession(user) {
  if (typeof sessionStorage !== 'undefined' && user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getPersistedSessionId() {
  if (typeof sessionStorage === 'undefined') return null;
  try { return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null')?.id || null; } catch { return null; }
}

export async function restoreSession() {
  if (!getToken()) return null;
  try {
    const payload = await apiRequest('/me');
    persistSession(payload.user);
    return payload.user;
  } catch (error) {
    if (!getToken()) return null;
    throw error;
  }
}

export async function logoutSession() {
  try {
    if (getToken()) await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    clearAuth();
  }
}
