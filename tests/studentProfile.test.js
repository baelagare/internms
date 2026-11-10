import test from 'node:test';
import assert from 'node:assert/strict';
import { profileValues, validateProfile, validatePortfolioEntry, formatProfileDate } from '../src-react/services/studentProfile.js';
import { changePortfolio, updateProfile, createLocalRepository } from '../src-react/services/localRepository.js';

const values = { gpa: '1.45', academicStanding: 'Regular Standing', email: 'student@example.edu', phone: '+63 917 123 4567', portfolioUrl: 'https://github.com/student', bio: 'My career summary' };
test('profile initialization never invents missing academic or contact records', () => {
  assert.deepEqual(profileValues({}), { gpa: '', academicStanding: '', email: '', phone: '', portfolioUrl: '', bio: '' });
  assert.equal(profileValues({ email: 'identity@example.edu', portfolioData: { email: '' } }).email, '');
});
test('profile form preserves grading range and validates each required field', () => {
  assert.deepEqual(validateProfile(values), {});
  for (const gpa of ['', ' ', '0', '5.01', 'NaN']) assert.ok(validateProfile({ ...values, gpa }).gpa);
  for (const gpa of ['1.00', '3.00', '5.00']) assert.equal(validateProfile({ ...values, gpa }).gpa, undefined);
  assert.ok(validateProfile({ ...values, gpa: '1.455' }).gpa);
  for (const key of ['academicStanding', 'email', 'phone', 'bio']) assert.ok(validateProfile({ ...values, [key]: ' ' })[key]);
});
test('professional links allow HTTP/S only and remain optional', () => {
  for (const portfolioUrl of ['', 'http://example.com', 'https://example.com/path?a=b']) assert.equal(validateProfile({ ...values, portfolioUrl }).portfolioUrl, undefined);
  for (const portfolioUrl of ['javascript:alert(1)', 'ftp://example.com', 'github.com/student']) assert.ok(validateProfile({ ...values, portfolioUrl }).portfolioUrl);
});
test('new skills and coursework reject blanks and duplicates without rewriting stored names', () => {
  for (const collection of ['skills', 'coursework']) {
    const original = 'JavaScript (ES6+) & React';
    const student = { id: 's', role: 'student', portfolioData: { [collection]: [original] } };
    const db = { users: [student] };
    assert.ok(validatePortfolioEntry([original], ` ${original.toLowerCase()} `));
    assert.ok(validatePortfolioEntry([], '   '));
    assert.throws(() => changePortfolio(db, student, collection, 'add', ` ${original.toUpperCase()} `), /already/);
    changePortfolio(db, student, collection, 'add', '  REST APIs & PostgreSQL  ');
    assert.deepEqual(student.portfolioData[collection], [original, 'REST APIs & PostgreSQL']);
  }
});
test('profile submission preserves institutional identity and clearance', () => {
  const student = { id: 's', name: 'Name', email: 'identity@example.edu', studentNumber: '2023-1234', role: 'student', disciplinaryClearance: 'Pending' };
  updateProfile({ users: [student] }, student, { ...values, disciplinaryClearance: 'Cleared', name: 'Changed' });
  assert.equal(student.name, 'Name');
  assert.equal(student.disciplinaryClearance, 'Pending');
  assert.equal(student.email, 'identity@example.edu');
  assert.equal(student.portfolioData.email, values.email);
});
test('failed duplicate transactions leave original recommendation strings intact', () => {
  const seed = { users: [{ id: 's', role: 'student', portfolioData: { skills: ['Python & FastAPI'] } }] };
  let raw = JSON.stringify(seed);
  const repository = createLocalRepository(seed, { getItem: () => raw, setItem: (_, value) => { raw = value; } });
  assert.throws(() => repository.transact(db => changePortfolio(db, seed.users[0], 'skills', 'add', 'python & fastapi')));
  assert.deepEqual(JSON.parse(raw), seed);
});
test('date display retains legacy year and month precision', () => {
  assert.equal(formatProfileDate('2026'), '2026');
  assert.equal(formatProfileDate('2026-03'), '2026-03');
  assert.equal(formatProfileDate(null), '');
  assert.equal(formatProfileDate('unknown'), 'unknown');
  assert.match(formatProfileDate('2026-09-05T01:00:00Z'), /2026/);
});