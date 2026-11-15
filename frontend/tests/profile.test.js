import test from 'node:test';
import assert from 'node:assert/strict';
import { academicStandings, formatProfileDate, profileValues, validatePortfolioEntry, validateProfile } from '../src/services/studentProfile.js';

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

  // Invalid GPA
  assert.ok(validateProfile({ ...valid, gpa: '0.90' }).gpa);
  assert.ok(validateProfile({ ...valid, gpa: '5.50' }).gpa);
  assert.ok(validateProfile({ ...valid, gpa: 'not-a-number' }).gpa);
  assert.ok(validateProfile({ ...valid, gpa: '1.755' }).gpa); // > 2 decimal places

  // Invalid standing
  assert.ok(validateProfile({ ...valid, academicStanding: 'Invalid Standing' }).academicStanding);

  // Invalid email
  assert.ok(validateProfile({ ...valid, email: 'not-an-email' }).email);

  // Invalid portfolio URL (disallows javascript: or unparseable schemes)
  assert.ok(validateProfile({ ...valid, portfolioUrl: 'javascript:alert(1)' }).portfolioUrl);
  assert.ok(validateProfile({ ...valid, portfolioUrl: 'ftp://files.example.com' }).portfolioUrl);
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
