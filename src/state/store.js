export const NEMSU_COLLEGES = {
  CITE: {
    code: 'CITE',
    name: 'College of Information Technology Education',
    programs: [
      'Bachelor of Science in Computer Science',
      'Bachelor of Science in Information Technology',
      'Bachelor of Science in Information Systems'
    ],
    defaultCoursework: [
      'CS 312: Software Engineering II',
      'CS 321: Database Management Systems',
      'CS 401: Artificial Intelligence & Machine Learning',
      'CS 315: Web Systems & Technologies',
      'IT 311: System Administration & Maintenance',
      'IT 322: Information Assurance & Security'
    ]
  },
  CBM: {
    code: 'CBM',
    name: 'College of Business and Management',
    programs: [
      'Bachelor of Science in Hospitality Management',
      'Bachelor of Science in Tourism Management',
      'Bachelor of Science in Business Administration major in Financial Management',
      'Bachelor of Science in Business Administration major in Marketing Management'
    ],
    defaultCoursework: [
      'HM 310: Front Office Operations',
      'HM 324: MICE & Banquet Management',
      'HM 215: Food Safety & Sanitation',
      'BM 301: Service Quality Management'
    ]
  },
  CAS: {
    code: 'CAS',
    name: 'College of Arts and Sciences',
    programs: [
      'Bachelor of Science in Environmental Science',
      'Bachelor of Arts in Biology',
      'Bachelor of Science in Biology',
      'Bachelor of Arts in English Language',
      'Bachelor of Arts in Political Science'
    ],
    defaultCoursework: [
      'BIO 314: Marine & Coastal Ecology',
      'ENV 320: Geographic Information Systems (GIS)',
      'CHEM 204: Analytical Environmental Chemistry',
      'BIO 401: Conservation Biology'
    ]
  },
  CET: {
    code: 'CET',
    name: 'College of Engineering and Technology',
    programs: [
      'Bachelor of Science in Civil Engineering',
      'Bachelor of Science in Mechanical Engineering',
      'Bachelor of Science in Electrical Engineering'
    ],
    defaultCoursework: [
      'CE 411: Reinforced Concrete Design',
      'CE 325: Construction Methods & Project Management',
      'CE 312: Geotechnical Engineering (Soil Mechanics)',
      'CE 308: Highway & Railroad Engineering'
    ]
  },
  CTE: {
    code: 'CTE',
    name: 'College of Teacher Education',
    programs: [
      'Bachelor of Secondary Education major in English',
      'Bachelor of Secondary Education major in Mathematics',
      'Bachelor of Secondary Education major in Filipino',
      'Bachelor of Elementary Education'
    ],
    defaultCoursework: [
      'EDUC 310: Assessment in Learning 1 & 2',
      'EDUC 315: Facilitating Learner-Centered Teaching',
      'ENG 322: Teaching & Assessment of Literature Studies',
      'EDUC 401: Field Study 1 & 2'
    ]
  }
};

export function inferCollegeFromProgram(program = '') {
  const p = String(program).toLowerCase();
  if (p.includes('computer') || p.includes('information')) return 'CITE';
  if (p.includes('hospitality') || p.includes('tourism') || p.includes('business')) return 'CBM';
  if (p.includes('engineering')) return 'CET';
  if (p.includes('education')) return 'CTE';
  return 'CAS';
}

const SESSION_KEY = 'internms_active_session_v2';

const state = {
  initialized: false,
  academicYear: 'A.Y. 2026–2027',
  campus: 'NEMSU Main Campus',
  currentUser: null,
  adminCollegeFilter: 'ALL',
  ragOfflineFallback: false,
  activeChatPartnerId: null,
  mobileChatThreadOpen: false,
  users: [],
  htes: [],
  collegeSettings: {},
  policyCorpus: [],
  logs: [],
  dtrDisputes: [],
  alerts: [],
  evaluations: [],
  auditLogs: [],
  messages: []
};

const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyStateChange() {
  for (const listener of listeners) {
    listener(state);
  }
}

export async function loadInitialDatabase() {
  const res = await fetch('/api/database', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to load InternMS database from server.');
  }
  const data = await res.json();
  hydrateState(data);

  // Restore active user session if saved
  try {
    const savedUserId = sessionStorage.getItem(SESSION_KEY);
    if (savedUserId) {
      const found = state.users.find(u => u.id === savedUserId);
      if (found) {
        state.currentUser = found;
      }
    }
  } catch (_) {
    // ignore storage errors
  }

  state.initialized = true;
  notifyStateChange();
  return state;
}

export function hydrateState(data = {}) {
  state.academicYear = data.academicYear || 'A.Y. 2026–2027';
  state.campus = data.campus || 'NEMSU Main Campus';
  state.users = Array.isArray(data.users) ? data.users : [];
  state.htes = Array.isArray(data.htes) ? data.htes : [];
  state.collegeSettings = data.collegeSettings || {};
  state.policyCorpus = Array.isArray(data.policyCorpus) ? data.policyCorpus : [];
  state.logs = Array.isArray(data.logs) ? data.logs : [];
  state.dtrDisputes = Array.isArray(data.dtrDisputes) ? data.dtrDisputes : [];
  state.alerts = Array.isArray(data.alerts) ? data.alerts : [];
  state.evaluations = Array.isArray(data.evaluations) ? data.evaluations : [];
  state.auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];
  state.messages = Array.isArray(data.messages) ? data.messages : [];

  if (state.currentUser) {
    const refreshed = state.users.find(u => u.id === state.currentUser.id);
    if (refreshed) {
      state.currentUser = refreshed;
    }
  }
}

export async function persistDatabase(notify = true) {
  const payload = {
    schemaVersion: '2026.2.0-PRD-ALIGNED',
    academicYear: state.academicYear,
    campus: state.campus,
    users: state.users,
    htes: state.htes,
    collegeSettings: state.collegeSettings,
    policyCorpus: state.policyCorpus,
    logs: state.logs,
    dtrDisputes: state.dtrDisputes,
    alerts: state.alerts,
    evaluations: state.evaluations,
    auditLogs: state.auditLogs,
    messages: state.messages
  };

  await fetch('/api/database', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (notify) {
    notifyStateChange();
  }
}

export function setCurrentUser(user) {
  state.currentUser = user;
  try {
    if (user) {
      sessionStorage.setItem(SESSION_KEY, user.id);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch (_) {
    // ignore
  }
  notifyStateChange();
}

export function setAdminCollegeFilter(collegeCode) {
  state.adminCollegeFilter = collegeCode || 'ALL';
  notifyStateChange();
}

export function toggleRagOfflineFallback(forceValue) {
  state.ragOfflineFallback = typeof forceValue === 'boolean' ? forceValue : !state.ragOfflineFallback;
  notifyStateChange();
}

/* ==========================================================================
   ROLE-BASED & MULTI-COLLEGE SCOPED SELECTORS
   ========================================================================== */
export function getActiveCollegeScope() {
  const user = state.currentUser;
  if (!user) return 'CITE';
  if (user.role === 'coordinator') return user.college || 'CITE';
  if (user.role === 'student') return user.college || 'CITE';
  if (user.role === 'admin') return state.adminCollegeFilter || 'ALL';
  return 'ALL';
}

export function getScopedStudents(explicitCollege = null) {
  const user = state.currentUser;
  const allStudents = state.users.filter(u => u.role === 'student');
  if (!user) return [];

  if (user.role === 'supervisor') {
    // STRICT MULTI-TENANT ISOLATION: Only interns assigned to supervisor's HTE company
    return allStudents.filter(s => s.company && s.company === user.company);
  }

  const targetCollege = explicitCollege || getActiveCollegeScope();
  if (targetCollege === 'ALL') return allStudents;
  return allStudents.filter(s => s.college === targetCollege);
}

export function getSupervisorScopedInterns() {
  const user = state.currentUser;
  if (!user || user.role !== 'supervisor' || !user.company) return [];
  // Never fall back to allInterns!
  return state.users.filter(u => u.role === 'student' && u.company === user.company);
}

export function getScopedLogs(explicitCollege = null) {
  const user = state.currentUser;
  if (!user) return [];

  if (user.role === 'student') {
    return state.logs.filter(l => l.studentId === user.id || l.student === user.name);
  }

  if (user.role === 'supervisor') {
    const companyStudents = new Set(getSupervisorScopedInterns().map(s => s.name));
    const companyStudentIds = new Set(getSupervisorScopedInterns().map(s => s.id));
    return state.logs.filter(
      l => l.company === user.company || companyStudentIds.has(l.studentId) || companyStudents.has(l.student)
    );
  }

  const targetCollege = explicitCollege || getActiveCollegeScope();
  if (targetCollege === 'ALL') return state.logs;
  const collegeStudents = new Set(getScopedStudents(targetCollege).map(s => s.name));
  return state.logs.filter(l => l.college === targetCollege || collegeStudents.has(l.student));
}

export function getScopedDisputes(explicitCollege = null) {
  const user = state.currentUser;
  if (!user) return [];
  if (user.role === 'student') {
    return state.dtrDisputes.filter(d => d.studentId === user.id);
  }
  if (user.role === 'supervisor') {
    return state.dtrDisputes.filter(d => d.company === user.company);
  }
  const targetCollege = explicitCollege || getActiveCollegeScope();
  if (targetCollege === 'ALL') return state.dtrDisputes;
  return state.dtrDisputes.filter(d => d.college === targetCollege);
}

export function getScopedAlerts(explicitCollege = null) {
  const targetCollege = explicitCollege || getActiveCollegeScope();
  if (targetCollege === 'ALL') return state.alerts;
  return state.alerts.filter(a => a.college === targetCollege);
}

export function getScopedHtes(explicitCollege = null) {
  const user = state.currentUser;
  if (user && user.role === 'supervisor') {
    return state.htes.filter(h => h.name === user.company);
  }
  const targetCollege = explicitCollege || getActiveCollegeScope();
  if (targetCollege === 'ALL') return state.htes;
  return state.htes.filter(h => h.college === targetCollege);
}

export function getCollegeQuotaHours(collegeCode = 'CITE') {
  const cfg = state.collegeSettings?.[collegeCode];
  return cfg?.requiredHours || 324;
}

export async function recordAuditLog({
  actionType,
  targetStudent,
  summary,
  ruleOrModelRef,
  originalDraft = '',
  finalDispatchedText = '',
  overrideReason = null,
  college = null
}) {
  const user = state.currentUser || { id: 'system', name: 'System', role: 'admin', college: 'ALL' };
  const entry = {
    id: `AUD-2026-${String(state.auditLogs.length + 1).padStart(4, '0')}`,
    timestamp: new Date().toISOString(),
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    college: college || user.college || 'ALL',
    actionType,
    targetStudent,
    summary,
    ruleOrModelRef,
    originalDraft,
    finalDispatchedText,
    overrideReason
  };
  state.auditLogs.unshift(entry);
  await persistDatabase(true);
  return entry;
}
