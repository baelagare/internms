import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NEMSU_COLLEGES, NEMSU_COLLEGE_PROGRAMS, collegeCodesForWorkspace } from '../src/config/institution.js';

test('official college catalog contains the 5 confirmed colleges', () => {
  const codes = Object.keys(NEMSU_COLLEGES).sort();
  assert.deepEqual(codes, ['CAS', 'CBM', 'CET', 'CITE', 'CTE']);
  assert.equal(NEMSU_COLLEGES.CAS.name, 'College of Arts and Sciences');
  assert.equal(NEMSU_COLLEGES.CBM.name, 'College of Business and Management');
  assert.equal(NEMSU_COLLEGES.CET.name, 'College of Engineering and Technology');
  assert.equal(NEMSU_COLLEGES.CITE.name, 'College of Information Technology Education');
  assert.equal(NEMSU_COLLEGES.CTE.name, 'College of Teacher Education');
});

test('college programs catalog includes all 22 approved academic degree programs', () => {
  assert.equal(NEMSU_COLLEGE_PROGRAMS.CAS.length, 8);
  assert.ok(NEMSU_COLLEGE_PROGRAMS.CAS.includes('BA in Political Science'));
  assert.ok(NEMSU_COLLEGE_PROGRAMS.CAS.includes('BS in Biology'));

  assert.equal(NEMSU_COLLEGE_PROGRAMS.CBM.length, 5);
  assert.ok(NEMSU_COLLEGE_PROGRAMS.CBM.includes('Financial Management'));
  assert.ok(NEMSU_COLLEGE_PROGRAMS.CBM.includes('Hospitality Management'));

  assert.equal(NEMSU_COLLEGE_PROGRAMS.CET.length, 1);
  assert.ok(NEMSU_COLLEGE_PROGRAMS.CET.includes('BS in Civil Engineering'));

  assert.equal(NEMSU_COLLEGE_PROGRAMS.CITE.length, 1);
  assert.ok(NEMSU_COLLEGE_PROGRAMS.CITE.includes('BS in Computer Science'));

  assert.equal(NEMSU_COLLEGE_PROGRAMS.CTE.length, 7);
  assert.ok(NEMSU_COLLEGE_PROGRAMS.CTE.includes('Bachelor of Elementary Education'));
  assert.ok(NEMSU_COLLEGE_PROGRAMS.CTE.includes('Bachelor of Early Childhood Education'));

  const totalPrograms = Object.values(NEMSU_COLLEGE_PROGRAMS).reduce((acc, list) => acc + list.length, 0);
  assert.equal(totalPrograms, 22);
});

test('applicationService exports student enrollment workflow actions', () => {
  const source = readFileSync(new URL('../src/services/applicationService.js', import.meta.url), 'utf8');
  assert.match(source, /export async function submitOnboarding/);
  assert.match(source, /export async function approveEnrollment/);
  assert.match(source, /export async function rejectEnrollment/);
  assert.match(source, /export async function updateEnrollment/);
});

test('intern directory view includes enrollment column and coordinator approve/reject actions', () => {
  const source = readFileSync(new URL('../src/views/Interns.jsx', import.meta.url), 'utf8');
  assert.match(source, /key: 'enrollment'/);
  assert.match(source, /approveEnrollment/);
  assert.match(source, /rejectEnrollment/);
  assert.match(source, /Pending Approval/);
  assert.match(source, /Enrollment status/);
});

test('student profile and dashboard expose onboarding and enrollment status notices', () => {
  const profileSource = readFileSync(new URL('../src/views/StudentProfile.jsx', import.meta.url), 'utf8');
  assert.match(profileSource, /StudentOnboardingModal/);
  assert.match(profileSource, /Academic Onboarding Required/);
  assert.match(profileSource, /Enrollment Pending Coordinator Approval/);

  const dashSource = readFileSync(new URL('../src/views/StudentDashboard.jsx', import.meta.url), 'utf8');
  assert.match(dashSource, /StudentOnboardingModal/);
  assert.match(dashSource, /Academic Onboarding Required/);
  assert.match(dashSource, /Enrollment Pending Coordinator Review/);
});
