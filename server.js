const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 4173;
const ROOT_DIR = __dirname;
const DB_FILE = path.join(ROOT_DIR, 'database.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function loadDb() {
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(raw);
}

function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function sanitizeUser(user) {
  if (!user) return null;
  const { pass, altPass, ...safeUser } = user;
  return safeUser;
}

function sanitizeDbForClient(db) {
  return {
    ...db,
    users: (db.users || []).map(sanitizeUser)
  };
}

function makeDefaultPreDeploymentChecklist() {
  return [
    { id: 'med_clearance', code: 'DOC-01', title: 'Medical Clearance Certificate', issuer: 'NEMSU University Infirmary / Licensed Physician', required: true, status: 'Not Uploaded', fileName: null, uploadedAt: null, verifiedBy: null, remarks: '' },
    { id: 'psych_assessment', code: 'DOC-02', title: 'Psychological Assessment Report', issuer: 'NEMSU Guidance & Counseling Center', required: true, status: 'Not Uploaded', fileName: null, uploadedAt: null, verifiedBy: null, remarks: '' },
    { id: 'parent_consent', code: 'DOC-03', title: 'Notarized Parent/Guardian Consent & Waiver', issuer: 'Legal Notary Public / Parent or Guardian', required: true, status: 'Not Uploaded', fileName: null, uploadedAt: null, verifiedBy: null, remarks: '' },
    { id: 'ojt_insurance', code: 'DOC-04', title: 'Student OJT Personal Accident Insurance Policy', issuer: 'Accredited Insurance Provider / University Cashier', required: true, status: 'Not Uploaded', fileName: null, uploadedAt: null, verifiedBy: null, remarks: '' },
    { id: 'moa_endorsement', code: 'DOC-05', title: 'Signed HTE Memorandum of Agreement (MOA) & Endorsement', issuer: 'OJT Placement Office & Host Training Establishment', required: true, status: 'Not Uploaded', fileName: null, uploadedAt: null, verifiedBy: null, remarks: '' }
  ];
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  try {
    // 1. Authentication: Institutional & External Login
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const identifier = String(body.identifier || body.id || '').trim().toLowerCase();
      const password = String(body.password || body.pass || '').trim();

      const db = loadDb();
      const matched = (db.users || []).find(u => {
        const idMatch = String(u.id || '').toLowerCase() === identifier;
        const emailMatch = String(u.email || '').toLowerCase() === identifier;
        const stuNumMatch = String(u.studentNumber || '').toLowerCase() === identifier;
        const passMatch = u.pass === password || (u.altPass && u.altPass === password);
        return (idMatch || emailMatch || stuNumMatch) && passMatch;
      });

      if (!matched) {
        return sendJson(res, 401, {
          ok: false,
          error: 'Invalid credentials. Please check your NEMSU ID / Email and password.'
        });
      }

      const token = crypto.randomBytes(16).toString('hex');
      return sendJson(res, 200, {
        ok: true,
        token,
        user: sanitizeUser(matched)
      });
    }

    // 2. Student Registration (Starts Unplaced per HITL Governance)
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const db = loadDb();
      const id = String(body.id || '').trim();
      const name = String(body.name || '').trim();
      const pass = String(body.pass || '').trim();
      const program = String(body.program || '').trim();
      const college = String(body.college || 'CITE').trim();
      const section = String(body.section || '4A').trim();
      const gpa = Number(body.gpa) || 1.75;

      if (!id || !name || !pass || !program) {
        return sendJson(res, 400, { ok: false, error: 'All registration fields are required.' });
      }

      const exists = (db.users || []).some(
        u => String(u.id).toLowerCase() === id.toLowerCase() || String(u.email || '').toLowerCase() === id.toLowerCase()
      );
      if (exists) {
        return sendJson(res, 409, { ok: false, error: 'A user with that Student ID or email already exists.' });
      }

      const newUser = {
        id,
        email: id.includes('@') ? id : `${id.toLowerCase()}@nemsu.edu.ph`,
        studentNumber: id,
        pass,
        role: 'student',
        name,
        college,
        program,
        section,
        gpa,
        academicStanding: gpa <= 1.50 ? "Dean's Lister" : 'Regular Standing',
        disciplinaryClearance: 'Cleared',
        placementStatus: 'Unplaced',
        preferredHte: null,
        preferredRole: null,
        company: 'Unassigned (Pending Coordinator Approval)',
        assignedRole: 'Unassigned',
        deploymentStartDate: null,
        clearanceStatus: 'Pre-Deployment',
        preDeploymentDocs: makeDefaultPreDeploymentChecklist(),
        portfolioData: {
          email: id.includes('@') ? id : `${id.toLowerCase()}@nemsu.edu.ph`,
          phone: body.phone || '+63 917 000 0000',
          portfolioUrl: '',
          bio: `${program} student intern at NEMSU Main Campus (${college}).`,
          skills: Array.isArray(body.skills) && body.skills.length ? body.skills : ['Technical Documentation', 'Team Collaboration'],
          coursework: Array.isArray(body.coursework) ? body.coursework : [],
          achievements: [],
          experiences: [],
          resume: null
        }
      };

      db.users.push(newUser);
      saveDb(db);
      return sendJson(res, 201, { ok: true, user: sanitizeUser(newUser) });
    }

    // 3. External HTE Supervisor Token Onboarding Portal
    if (pathname === '/api/auth/supervisor-onboard' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const inviteToken = String(body.inviteToken || '').trim().toUpperCase();
      const email = String(body.email || '').trim();
      const name = String(body.name || '').trim();
      const password = String(body.password || '').trim();

      const db = loadDb();
      const hte = (db.htes || []).find(h => String(h.inviteToken || '').toUpperCase() === inviteToken);
      if (!hte) {
        return sendJson(res, 404, {
          ok: false,
          error: 'Invalid or expired HTE Invitation Token. Please request a valid token from your NEMSU College OJT Coordinator.'
        });
      }

      let supUser = (db.users || []).find(
        u => u.role === 'supervisor' && (String(u.inviteToken || '').toUpperCase() === inviteToken || u.company === hte.name)
      );

      if (!supUser) {
        supUser = {
          id: email || `sup-${hte.id}`,
          email: email || hte.supervisorEmail,
          pass: password || 'super123',
          role: 'supervisor',
          name: name || hte.supervisorName,
          company: hte.name,
          title: `HTE Partner Supervisor · ${hte.name}`,
          inviteToken: hte.inviteToken
        };
        db.users.push(supUser);
      } else {
        if (email) supUser.email = email;
        if (name) supUser.name = name;
        if (password) supUser.pass = password;
      }

      saveDb(db);
      return sendJson(res, 200, {
        ok: true,
        user: sanitizeUser(supUser),
        hte
      });
    }

    // 4. Immutable HITL Audit Log Endpoint
    if (pathname === '/api/audit-logs' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const db = loadDb();
      db.auditLogs = db.auditLogs || [];
      const entry = {
        id: `AUD-2026-${String(db.auditLogs.length + 1).padStart(4, '0')}`,
        timestamp: new Date().toISOString(),
        actorId: body.actorId || 'system',
        actorName: body.actorName || 'Coordinator',
        actorRole: body.actorRole || 'coordinator',
        college: body.college || 'ALL',
        actionType: body.actionType || 'HITL_DECISION',
        targetStudent: body.targetStudent || '',
        summary: body.summary || '',
        ruleOrModelRef: body.ruleOrModelRef || '',
        originalDraft: body.originalDraft || '',
        finalDispatchedText: body.finalDispatchedText || '',
        overrideReason: body.overrideReason || null
      };
      db.auditLogs.unshift(entry);
      saveDb(db);
      return sendJson(res, 201, { ok: true, entry });
    }

    // 5. HTE Supervisor Evaluations Persistence Endpoint
    if (pathname === '/api/evaluations' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const db = loadDb();
      db.evaluations = db.evaluations || [];
      const existingIdx = db.evaluations.findIndex(e => e.studentId === body.studentId && e.company === body.company);
      const record = {
        ...body,
        id: body.id || `EVAL-2026-${Date.now()}`,
        submittedAt: body.submittedAt || new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      };
      if (existingIdx >= 0) {
        db.evaluations[existingIdx] = record;
      } else {
        db.evaluations.unshift(record);
      }
      saveDb(db);
      return sendJson(res, 200, { ok: true, evaluation: record });
    }

    // 6. Database State Sync Endpoint (Sanitizes passwords on GET, merges passwords on POST/PUT)
    if (pathname === '/api/database') {
      if (req.method === 'GET') {
        const db = loadDb();
        return sendJson(res, 200, sanitizeDbForClient(db));
      }

      if (req.method === 'POST' || req.method === 'PUT') {
        const incoming = await readJsonBody(req);
        const existingDb = loadDb();
        const existingUsersById = new Map((existingDb.users || []).map(u => [u.id, u]));

        if (Array.isArray(incoming.users)) {
          incoming.users = incoming.users.map(u => {
            const prev = existingUsersById.get(u.id);
            return {
              ...(prev || {}),
              ...u,
              pass: u.pass || (prev ? prev.pass : '123456'),
              altPass: u.altPass || (prev ? prev.altPass : undefined)
            };
          });
        }

        const mergedDb = {
          ...existingDb,
          ...incoming
        };
        saveDb(mergedDb);
        return sendJson(res, 200, { ok: true });
      }

      return sendJson(res, 405, { error: 'Method not allowed' });
    }
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || 'Internal Server Error' });
  }

  // Static Asset Serving
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(ROOT_DIR, relativePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`InternMS server running at http://${HOST}:${PORT}`);
});
