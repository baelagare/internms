import { NEMSU_COLLEGES } from '../../src/state/store.js';
export function safeUser(user) { const { pass, altPass, password, ...safe } = user; return safe; }
export function authenticate(db, identifier, password) {
  const normalized = String(identifier || '').trim().toLowerCase();
  const user = db.users.find(candidate => [candidate.id, candidate.email, candidate.studentNumber].filter(Boolean).some(value => String(value).toLowerCase() === normalized) && [candidate.pass, candidate.altPass].filter(Boolean).includes(password));
  if (!user) throw new Error('Check your ID or email and password, then try again.');
  return safeUser(user);
}
export function registerMockStudent(db, values, checklistTemplate) {
  const id = String(values.id || '').trim(), name = String(values.name || '').trim(), password = values.password || values.pass || '';
  const college = values.college, program = values.program, hasGpa = values.gpa !== undefined && values.gpa !== null && values.gpa !== '';
  const gpa = hasGpa ? Number(values.gpa) : null;
  if (!id || !name || password.length < 8) throw new Error('Enter your student ID, full name, and a password of at least eight characters.');
  if (values.password_confirmation !== undefined && values.password_confirmation !== password) throw new Error('Passwords do not match.');
  if (!NEMSU_COLLEGES[college]?.programs.includes(program)) throw new Error('Choose a program and its matching college.');
  if (hasGpa && (!Number.isFinite(gpa) || gpa < 1 || gpa > 5)) throw new Error('GPA must be between 1.00 and 5.00.');
  const email = values.email?.trim() || (id.includes('@') ? id : `${id.toLowerCase()}@nemsu.edu.ph`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email.');
  if (db.users.some(user => [user.id, user.email, user.studentNumber].filter(Boolean).some(value => [id.toLowerCase(), email.toLowerCase()].includes(value.toLowerCase())))) throw new Error('This student ID or email is already registered.');
  const user = { id, name, email, studentNumber: id, pass: password, role: 'student', college, program, section: values.section?.trim() || '', gpa, academicStanding: hasGpa ? (gpa <= 1.5 ? "Dean's Lister" : 'Regular Standing') : 'Pending Verification', disciplinaryClearance: 'Cleared', placementStatus: 'Unplaced', preferredHte: null, preferredRole: null, company: 'Unassigned (Pending Coordinator Approval)', assignedRole: 'Unassigned', deploymentStartDate: null, clearanceStatus: 'Pre-Deployment', preDeploymentDocs: checklistTemplate.map(item => ({ id: item.id, code: item.code, title: item.title, issuer: item.issuer, required: true, status: 'Not Uploaded', fileName: null, uploadedAt: null, verifiedBy: null, remarks: '' })), portfolioData: { email, phone: values.phone || '+63 917 000 0000', portfolioUrl: '', bio: `${program} student intern at NEMSU Main Campus (${college}).`, skills: ['Technical Documentation', 'Team Collaboration'], coursework: [...NEMSU_COLLEGES[college].defaultCoursework], achievements: [], experiences: [], resume: null } };
  db.users.push(user);
  return safeUser(user);
}
export function onboardMockSupervisor(db, values) {
  const token = String(values.inviteToken || '').trim().toUpperCase();
  const partner = db.htes.find(item => item.inviteToken?.toUpperCase() === token);
  if (!token || !partner) throw new Error('Invalid or expired HTE invitation token. Request a valid token from your coordinator.');
  let user = db.users.find(item => item.role === 'supervisor' && (item.inviteToken?.toUpperCase() === token || item.company === partner.name));
  const email = values.email?.trim(), name = values.name?.trim(), password = values.password;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email.');
  if (email && db.users.some(item => item.id !== user?.id && (item.email?.toLowerCase() === email.toLowerCase() || item.id.toLowerCase() === email.toLowerCase()))) throw new Error('This email is already in use.');
  if (!user) {
    const id = email || `sup-${partner.id}`;
    if (db.users.some(item => item.id === id)) throw new Error('This supervisor login already exists.');
    user = { id, email: email || partner.supervisorEmail, pass: password || 'super123', role: 'supervisor', name: name || partner.supervisorName, company: partner.name, title: `HTE Partner Supervisor · ${partner.name}`, inviteToken: partner.inviteToken };
    db.users.push(user);
  } else {
    if (email) user.email = email;
    if (name) user.name = name;
    if (password) user.pass = password;
  }
  return safeUser(user);
}