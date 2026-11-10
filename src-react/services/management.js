import { NEMSU_COLLEGES } from '../../src/state/store.js';
import { recordLocalAudit } from './placement.js';
const text = (value, label) => { if (!String(value || '').trim()) throw new Error(`${label} is required.`); return String(value).trim(); };
const numeric = (value, min, max, label) => { const n = Number(value); if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${label} must be between ${min} and ${max}.`); return n; };
const list = value => String(value || '').split(',').map(item => item.trim()).filter(Boolean);
export function savePartnerRecord(db, actor, id, values) {
  const existing = id ? db.htes.find(item => item.id === id) : null;
  if (id && !existing) throw new Error('Partner not found.');
  const supervisor = actor.role === 'supervisor';
  if (!['admin', 'coordinator', 'supervisor'].includes(actor.role) || (supervisor && (!existing || existing.name !== actor.company)) || (actor.role === 'coordinator' && existing && existing.college !== actor.college)) throw new Error('Partner is outside your authorized scope.');
  const college = supervisor ? existing.college : values.college;
  if (!NEMSU_COLLEGES[college] || (actor.role === 'coordinator' && college !== actor.college)) throw new Error('Choose an authorized college.');
  const name = supervisor ? existing.name : text(values.name, 'Company name');
  const token = supervisor ? existing.inviteToken : text(values.inviteToken, 'Invitation token').toUpperCase();
  if (db.htes.some(item => item.id !== id && (item.name.toLowerCase() === name.toLowerCase() || item.inviteToken?.toUpperCase() === token))) throw new Error('Company name and invitation token must be unique.');
  const maxSlots = numeric(values.maxSlots, 1, 50, 'Capacity');
  if (maxSlots < (existing?.filledSlots || 0)) throw new Error('Capacity cannot be lower than filled slots.');
  const record = { ...(existing || { id: `hte-${crypto.randomUUID()}`, filledSlots: 0, location: 'Tandag City, Surigao del Sur', supervisorEmail: 'partner@hte.ph', targetPrograms: NEMSU_COLLEGES[college].programs, requiredCoursework: NEMSU_COLLEGES[college].defaultCoursework.slice(0, 2) }), name, college, inviteToken: token, roleTitle: text(values.roleTitle, 'Role title'), maxSlots, minGpa: numeric(values.minGpa, 1, 3, 'GPA cutoff'), supervisorName: supervisor ? existing.supervisorName : text(values.supervisorName, 'Supervisor name'), description: text(values.description, 'Role description'), requiredSkills: list(text(values.requiredSkills, 'Required skills')) };
  if (existing) {
    if (name !== existing.name) {
      for (const collection of ['users', 'logs', 'dtrDisputes', 'evaluations', 'alerts']) for (const record of db[collection] || []) {
        if (record.company === existing.name) record.company = name;
        if (record.preferredHte === existing.name) record.preferredHte = name;
      }
    }
    Object.assign(existing, record);
  } else db.htes.unshift(record);
}
export function createStaffRecord(db, actor, values) {
  if (actor.role !== 'admin') throw new Error('Administrator authorization required.');
  if (!['coordinator', 'supervisor'].includes(values.role)) throw new Error('Choose coordinator or supervisor.');
  const id = text(values.id, 'Login ID'), name = text(values.name, 'Name'), pass = text(values.pass, 'Initial password'), scope = text(values.scope, 'Scope');
  if (db.users.some(user => user.id.toLowerCase() === id.toLowerCase() || user.email?.toLowerCase() === id.toLowerCase())) throw new Error('This login ID already exists.');
  if (values.role === 'coordinator' && !NEMSU_COLLEGES[scope.toUpperCase()]) throw new Error('Choose a valid college code.');
  if (values.role === 'supervisor' && !db.htes.some(partner => partner.name === scope)) throw new Error('Choose an existing partner company.');
  const partner = db.htes.find(item => item.name === scope);
  db.users.push({ id, name, pass, email: id.includes('@') ? id : `${id}@nemsu.edu.ph`, role: values.role, ...(values.role === 'coordinator' ? { college: scope.toUpperCase(), title: `${scope.toUpperCase()} OJT Coordinator` } : { company: scope, title: `Supervisor · ${scope}`, inviteToken: partner.inviteToken }) });
}
export const settingsFields = [
  ['requiredHours', 'Required OJT hours', 100, 1200, 1], ['maxGpaCutoff', 'Default GPA cutoff', 1, 3, 0.05], ['ruleAMaxConsecutiveAbsences', 'Maximum consecutive absences (days)', 1, 15, 1], ['ruleAMaxDeficitPct', 'Maximum hours deficit (%)', 5, 50, 1], ['ruleBConsecutiveWeeks', 'Consecutive task mismatch weeks', 1, 8, 1]
];
export function saveSettingsRecord(db, actor, college, values) {
  if (!NEMSU_COLLEGES[college] || !(actor.role === 'admin' || (actor.role === 'coordinator' && actor.college === college))) throw new Error('College settings are outside your authorized scope.');
  const config = { ...db.collegeSettings[college], college, fullName: NEMSU_COLLEGES[college].name };
  for (const [key, label, min, max] of settingsFields) config[key] = numeric(values[key], min, max, label);
  config.ruleBClericalKeywords = list(text(values.ruleBClericalKeywords, 'Clerical keywords'));
  db.collegeSettings[college] = config;
  recordLocalAudit(db, actor, { name: `All ${college} Interns`, college }, 'COLLEGE_THRESHOLDS_UPDATED', `Updated ${college} quota and alert thresholds.`, { finalDispatchedText: JSON.stringify(config), ruleOrModelRef: 'College Settings' });
}
export function createPolicyRecord(db, actor, values) {
  if (actor.role !== 'admin') throw new Error('Administrator authorization required.');
  const record = {};
  for (const key of ['chunkId', 'sourceDoc', 'sectionRef', 'title', 'ruleCategory', 'verbatimText']) record[key] = text(values[key], key);
  if (!['RULE_A_ATTENDANCE', 'RULE_B_MISALIGNMENT', 'RULE_C_DOCS'].includes(record.ruleCategory)) throw new Error('Choose a supported alert category.');
  if (db.policyCorpus.some(item => item.chunkId === record.chunkId)) throw new Error('Clause ID already exists.');
  db.policyCorpus.unshift({ ...record, keywords: record.title.toLowerCase().split(' '), embeddingDim: 384, lastIndexed: new Date().toISOString().slice(0, 10), status: 'Indexed' });
}