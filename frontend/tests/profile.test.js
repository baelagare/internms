import test from 'node:test';
import assert from 'node:assert/strict';
import { academicStandings, formatProfileDate, profileValues, refreshedProfileValues, validatePortfolioEntry, validateProfile } from '../src/services/studentProfile.js';

test('profileValues safely extracts student values without leaking null or undefined into form state', () => {
  const empty = profileValues({});
  assert.equal(empty.gpa, '');
  assert.equal(empty.academicStanding, '');
  assert.equal(empty.email, '');
  assert.equal(empty.phone, '');
  assert.equal(empty.portfolioUrl, '');
  assert.equal(empty.bio, '');

  const populated = profileValues({
    gpa: 1.45,
    academicStanding: "Dean's Lister",
    email: 'student@nemsu.edu.ph',
    portfolioData: {
      phone: '+63 900 123 4567',
      portfolioUrl: 'https://github.com/nemsu-student',
      bio: 'Aspiring software engineer'
    }
  });
  assert.equal(populated.gpa, '1.45');
  assert.equal(populated.academicStanding, "Dean's Lister");
  assert.equal(populated.email, 'student@nemsu.edu.ph');
  assert.equal(populated.phone, '+63 900 123 4567');
  assert.equal(populated.portfolioUrl, 'https://github.com/nemsu-student');
  assert.equal(populated.bio, 'Aspiring software engineer');
});
test('workspace profile records override stale session details without changing session-only fields', async () => {
  const { workspaceUser } = await import('../src/services/workspaceAdapter.js');
  const sessionUser = { id: 5, role: 'student', name: 'Gerrald Juntilla', email: 'jcjuntilla@nemsu.edu.ph', oldSessionField: true };
  const seeded = {
    id: 5,
    role: 'student',
    gpa: 1.75,
    studentNumber: '27-02004',
    program: 'BS in Computer Science',
    college: 'CITE',
    portfolioData: {
      bio: 'Computer Science senior focusing on algorithm engineering, data structures, backend pipelines, and applied intelligence.',
      skills: ['Algorithm Design', 'Python', 'React'],
      coursework: ['Data Structures and Algorithms', 'Artificial Intelligence']
    }
  };

  const current = workspaceUser(sessionUser, [seeded]);
  assert.equal(current.email, sessionUser.email);
  assert.equal(current.role, 'student');
  assert.equal(current.oldSessionField, true);
  assert.equal(current.gpa, 1.75);
  assert.equal(current.studentNumber, '27-02004');
  assert.equal(current.portfolioData.bio, seeded.portfolioData.bio);
  assert.deepEqual(current.portfolioData.skills, seeded.portfolioData.skills);
  assert.deepEqual(current.portfolioData.coursework, seeded.portfolioData.coursework);
  assert.equal(workspaceUser(sessionUser, []), sessionUser);
});

test('async workspace profile data hydrates pristine forms but never replaces unsaved edits', () => {
  const initial = profileValues({ email: 'jcjuntilla@nemsu.edu.ph' });
  const seeded = {
    name: 'Gerrald Juntilla',
    email: 'jcjuntilla@nemsu.edu.ph',
    gpa: 1.75,
    portfolioData: {
      bio: 'Computer Science senior focusing on algorithm engineering, data structures, backend pipelines, and applied intelligence.',
      skills: ['Algorithm Design', 'Python', 'React'],
      coursework: ['Data Structures and Algorithms', 'Artificial Intelligence']
    }
  };

  const hydrated = refreshedProfileValues(initial, initial, seeded);
  assert.equal(hydrated.gpa, '1.75');
  assert.equal(hydrated.bio, seeded.portfolioData.bio);
  assert.deepEqual(seeded.portfolioData.skills, ['Algorithm Design', 'Python', 'React']);
  assert.deepEqual(seeded.portfolioData.coursework, ['Data Structures and Algorithms', 'Artificial Intelligence']);

  const edited = { ...initial, bio: 'My unsaved changes' };
  assert.equal(refreshedProfileValues(edited, initial, seeded), null);
  assert.equal(refreshedProfileValues(hydrated, hydrated, seeded), null);
});



test('validateProfile enforces Philippine university grading bounds (1.00 - 5.00) and required contact fields', () => {
  const valid = {
    gpa: '1.75',
    academicStanding: 'Regular Standing',
    email: 'intern@nemsu.edu.ph',
    phone: '+63 912 345 6789',
    portfolioUrl: 'https://portfolio.dev',
    bio: 'Fourth year student specializing in computing systems'
  };
  assert.deepEqual(validateProfile(valid), {});
  // Read-only API-managed fields don't block saving editable profile fields.
  assert.deepEqual(validateProfile({ ...valid, academicStanding: '', email: '', portfolioUrl: 'not-a-url' }), {});

  // Invalid GPA
  assert.ok(validateProfile({ ...valid, gpa: '0.90' }).gpa);
  assert.ok(validateProfile({ ...valid, gpa: '5.50' }).gpa);
  assert.ok(validateProfile({ ...valid, gpa: 'not-a-number' }).gpa);
  assert.ok(validateProfile({ ...valid, gpa: '1.755' }).gpa); // > 2 decimal places

  assert.ok(validateProfile({ ...valid, phone: '' }).phone);
  assert.ok(validateProfile({ ...valid, bio: '' }).bio);
});

test('validatePortfolioEntry rejects duplicate and blank entries', () => {
  const existing = ['React', 'PostgreSQL', 'Docker'];
  assert.ok(validatePortfolioEntry(existing, ''));
  assert.ok(validatePortfolioEntry(existing, '   '));
  assert.ok(validatePortfolioEntry(existing, 'react')); // case-insensitive duplicate
  assert.ok(validatePortfolioEntry(existing, 'Docker '));
  assert.equal(validatePortfolioEntry(existing, 'Kubernetes'), '');
});

test('formatProfileDate formats valid dates and never manufactures false days or months', () => {
  assert.equal(formatProfileDate(''), '');
  assert.equal(formatProfileDate(null), '');
  assert.equal(formatProfileDate('2026-10-15'), 'Oct 15, 2026');
  assert.equal(formatProfileDate('Partial Year 2026'), 'Partial Year 2026');
});
