import test from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase, restoreSession } from '../src/services/apiClient.js';
import * as operations from '../src/services/applicationService.js';
import { scopedStudents, contactsFor } from '../src/services/records.js';
import { dashboardSummary } from '../src/services/studentDashboard.js';
import { checklistPage, validateDocumentFile } from '../src/services/studentChecklist.js';
import { hostCapacity, validMatchPercent, placementRecommendations } from '../src/services/studentPlacement.js';
import { calculateDailyHours, ojtHoursOverview } from '../src/services/studentAttendance.js';
import { getDefaultNarrativeTemplate, loadNarrativeDraft, validateWeeklyTaskReport, getTaskLogsModuleOverview } from '../src/services/studentTaskLogs.js';
import { profileValues, validateProfile } from '../src/services/studentProfile.js';
import { scoreEvaluation } from '../src/services/evaluations.js';
import { allowedRoutes } from '../src/services/routes.js';
import { NEMSU_COLLEGES } from '../src/config/institution.js';

test('unauthenticated workspace reads remain empty and do not call the API', async () => {
  const data = await getDatabase();
  for (const value of Object.values(data)) if (Array.isArray(value)) assert.equal(value.length, 0);
  assert.deepEqual(data.collegeSettings, {});
  assert.equal(data.academicYear, null);
  data.users.push(null);
  assert.deepEqual((await getDatabase()).users, []);
});

test('unauthenticated auth reads do not restore a session and mutations require sign-in', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Unexpected transport'); };
  try {
    assert.equal(await restoreSession(), null);
    await assert.rejects(() => operations.postMessage({}, 1, 'Hello'), /Sign in before saving/);
  } finally { globalThis.fetch = original; }
});

test('all role selectors return empty collections without demo identities', async () => {
  const db = await getDatabase();
  for (const role of Object.keys(allowedRoutes)) {
    assert.deepEqual(scopedStudents(db, { role }), []);
    assert.deepEqual(contactsFor(db, { role }), []);
  }
});

test('missing requirements and quotas are unknown, not invented defaults', async () => {
  const db = await getDatabase();
  const summary = dashboardSummary({}, db);
  assert.equal(summary.required, null);
  assert.equal(summary.quota, null);
  assert.equal(summary.percent, null);
  const attendance = ojtHoursOverview(db, {});
  assert.equal(attendance.required, null);
  assert.equal(attendance.remaining, null);
  assert.equal(attendance.percent, null);
  assert.equal(getTaskLogsModuleOverview(db, {}).requiredQuota, null);
  assert.deepEqual(Object.keys(NEMSU_COLLEGES).sort(), ['CAS', 'CBM', 'CET', 'CITE', 'CTE']);
  assert.equal(NEMSU_COLLEGES.CITE.name, 'College of Information Technology Education');
  assert.equal(NEMSU_COLLEGES.CBM.name, 'College of Business and Management');
  assert.equal(NEMSU_COLLEGES.CTE.name, 'College of Teacher Education');
});

test('empty lists and unavailable matching do not create results', async () => {
  assert.deepEqual(checklistPage([]).rows, []);
  assert.equal(hostCapacity({}), null);
  assert.equal(validMatchPercent(undefined), null);
  assert.equal(validMatchPercent(-1), null);
  assert.deepEqual(placementRecommendations({}, await getDatabase()).matches, []);
});

test('blank narratives stay blank and old browser drafts are not restored', () => {
  assert.deepEqual(getDefaultNarrativeTemplate(), { intro: '', reflection: '' });
  assert.deepEqual(loadNarrativeDraft(), { intro: '', reflection: '', isSavedDraft: false, updatedAt: null });
});

test('blank and incomplete evaluation cannot yield a score', () => {
  assert.throws(() => scoreEvaluation(), /Rate all/);
  assert.throws(() => scoreEvaluation({ q1: 0 }), /Rate all/);
});

test('missing profile, report and document inputs fail validation', () => {
  const errors = validateProfile(profileValues({}));
  for (const field of ['gpa', 'phone', 'bio']) assert.ok(errors[field]);
  for (const field of ['academicStanding', 'email', 'portfolioUrl']) assert.equal(errors[field], undefined);
  const reportErrors = validateWeeklyTaskReport();
  for (const field of ['weekNumber', 'hours', 'competencyTag', 'title', 'description', 'snapshot']) assert.ok(reportErrors[field]);
  assert.ok(validateDocumentFile(null));
});

test('missing or invalid attendance times never manufacture credited hours', () => {
  assert.equal(calculateDailyHours('', '', '', ''), 0);
  assert.equal(calculateDailyHours('invalid', 'invalid', '', ''), 0);
});

test('role route boundaries remain intact', () => {
  assert.equal(allowedRoutes.student.includes('staff'), false);
  assert.equal(allowedRoutes.supervisor.includes('settings'), false);
  assert.equal(Object.values(allowedRoutes).reduce((sum, routes) => sum + routes.length, 0), 32);
});


test('application sources contain no seed imports, premature HTTP calls or obsolete auth flag', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const location = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
      if (entry.isDirectory()) await inspect(location);
      else if (/\.(js|jsx|css)$/.test(entry.name)) {
        const source = await readFile(location, 'utf8');
        assert.doesNotMatch(source, /seedDatabase|database\.json|useMock|VITE_USE_MOCK_API/, location.pathname);
      }
    }
  }
  await inspect(new URL('../src/', import.meta.url));
});
