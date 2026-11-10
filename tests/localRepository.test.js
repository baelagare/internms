import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalRepository, scopedStudents, contactsFor, updateProfile, changePortfolio, sendMessage } from '../src-react/services/localRepository.js';
import { allowedRoutes } from '../src-react/services/routes.js';

const seed = { users: [
  { id: 's', role: 'student', name: 'Student', college: 'CITE', company: 'A', portfolioData: { skills: [] } },
  { id: 'other', role: 'student', college: 'CBM', company: 'B' },
  { id: 'c', role: 'coordinator', college: 'CITE' },
  { id: 'sc', role: 'supervisor', company: 'A' },
  { id: 'sb', role: 'supervisor', company: 'B' },
  { id: 'a', role: 'admin' }
], messages: [] };
const fresh = () => structuredClone(seed);
const memory = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };

test('local reads are isolated and transactions survive repository recreation', () => {
  const storage = memory();
  const repository = createLocalRepository(seed, storage);
  repository.read().users[0].name = 'Not saved';
  assert.equal(repository.read().users[0].name, 'Student');
  repository.transact(db => { db.users[0].name = 'Saved'; });
  assert.equal(createLocalRepository(seed, storage).read().users[0].name, 'Saved');
});
test('failed mutations do not commit partial updates', () => {
  const repository = createLocalRepository(seed, memory());
  assert.throws(() => repository.transact(db => { db.users.pop(); throw new Error('Failed'); }));
  assert.equal(repository.read().users.length, seed.users.length);
});
test('storage failure and corrupted data are reported rather than silently reset', () => {
  assert.throws(() => createLocalRepository(seed, { setItem() { throw new Error(); } }).write(seed), /not been committed/);
  assert.throws(() => createLocalRepository(seed, { getItem: () => '{broken' }).read(), /unreadable/);
});
test('student, coordinator, supervisor and admin scopes are distinct', () => {
  const db = fresh();
  for (const id of ['s', 'c', 'sc']) assert.deepEqual(scopedStudents(db, db.users.find(user => user.id === id)).map(user => user.id), ['s']);
  assert.equal(scopedStudents(db, db.users.find(user => user.id === 'a')).length, 2);
  assert.equal(scopedStudents(db, { role: 'supervisor' }).length, 0);
  assert.equal(scopedStudents(db, { role: 'admin' }, 'CBM')[0].id, 'other');
});
test('profile updates validate fields and cannot change identity, role or clearance', () => {
  const db = fresh(), actor = db.users[0];
  const values = { gpa: 1.5, academicStanding: 'Regular Standing', email: 's@example.com', phone: '123', bio: 'Summary', portfolioUrl: 'https://example.com', role: 'admin' };
  updateProfile(db, actor, values);
  assert.equal(actor.gpa, 1.5);
  assert.equal(actor.role, 'student');
  assert.throws(() => updateProfile(db, actor, { ...values, gpa: 8 }), /GPA/);
  assert.throws(() => updateProfile(db, actor, { ...values, portfolioUrl: 'javascript:alert(1)' }), /HTTP/);
  assert.throws(() => updateProfile(db, db.users[2], values), /own student/);
});
test('skills, coursework and achievements support validated add/remove', () => {
  const db = fresh(), actor = db.users[0];
  changePortfolio(db, actor, 'skills', 'add', ' React ');
  assert.deepEqual(actor.portfolioData.skills, ['React']);
  changePortfolio(db, actor, 'skills', 'remove', 0);
  assert.deepEqual(actor.portfolioData.skills, []);
  assert.throws(() => changePortfolio(db, actor, 'skills', 'remove', 9));
  changePortfolio(db, actor, 'achievements', 'add', { title: 'Project', issuer: 'University', description: 'Completed' });
  assert.equal(actor.portfolioData.achievements.length, 1);
  assert.throws(() => changePortfolio(db, actor, 'achievements', 'add', {}));
});
test('messages enforce legacy contact scopes and reject blank text', () => {
  const db = fresh(), actor = db.users[0];
  assert.deepEqual(contactsFor(db, actor).map(user => user.id), ['c', 'sc', 'a']);
  sendMessage(db, actor, 'c', ' Hello ');
  assert.equal(db.messages[0].text, 'Hello');
  assert.throws(() => sendMessage(db, actor, 'sb', 'Not permitted'), /outside/);
  assert.throws(() => sendMessage(db, actor, 'c', ' '), /Enter/);
});
test('route allowlists do not grant student or supervisor management privileges', () => {
  assert.equal(allowedRoutes.student.includes('staff'), false);
  assert.equal(allowedRoutes.supervisor.includes('partners'), false);
  assert.equal(allowedRoutes.supervisor.includes('alerts'), false);
  for (const routes of Object.values(allowedRoutes)) assert.ok(routes.includes('messages'));
});